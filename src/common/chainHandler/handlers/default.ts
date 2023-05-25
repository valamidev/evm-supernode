import { EventHandler } from "../../../component/eventHandler";
import { ChainConfig, Config } from "../../config";
import { EthereumAPI } from "../../evm/rpcClient";
import { RequestMultiplePromisesWithTimeout } from "../../promise/handler";
import { GetConsensusValue } from "../../utilts";
import { EvmChainHandler } from "../interface";

export class DefaultChainHandler implements EvmChainHandler {
  private readonly maxProviderCount = 5;
  private readonly providers: EthereumAPI[] = [];
  private readonly allProviders: EthereumAPI[] = [];

  private maxRequestTime: number = 1500;
  private maxProxyRequestTime: number = 5000;
  private latestBlock: number = 0;
  private blockLag: number = 0;
  private blockTime: number = 15 * 1000; // ETH default block time
  private intervalHandler!: NodeJS.Timer;
  private readonly eventHandler: EventHandler;
  private readonly config?: ChainConfig;
  private readonly logging: boolean | undefined;

  constructor(
    private chainId: number,
    private chainName: string,
    private rpcs: string[],
    private realTimeBlockFetch = true
  ) {
    this.eventHandler = EventHandler.getInstance();
    this.logging = Config.load()?.loggingEnabled;

    this.config = Config.load()?.chainConfigs?.[chainId] as ChainConfig;

    if (this.config?.blockTimeMs) {
      this.blockTime = this.config.blockTimeMs;
    }

    this.ProxyRequestHandlerInit();
    this.LoadProviders();
    this.NewProviderHandler();
  }

  public Start() {
    if (!this.config?.blockTimeMs) {
      setTimeout(async () => {
        try {
          await this.CalculateBlockTime();
        } catch (error) {
          this.Logging(error);
        }
      }, 1000 * Math.random());
    }

    setInterval(() => {
      this.RefreshProviders();
    }, 15000);

    if (this.realTimeBlockFetch) {
      this.FetchBlocks();

      setInterval(() => {
        try {
          this.CalculateBlockLag();
  
          if (this.blockLag > 1) {
            this.RefreshProviders();
          }
        } catch (error) {
          this.Logging(error);
        }
      }, this.blockTime * 30);
    }
  }

  private async ProxyRequestHandlerInit() {
    this.eventHandler.on("rpcRequest", async (data) => {
      if (data.chainId === this.chainId) {
        const promises = this.providers.map((provider) => {
          return provider.ProxyRequest(data.body);
        });

        const { success, error } = await RequestMultiplePromisesWithTimeout(
          promises,
          this.maxProxyRequestTime
        );

        if (success[0]) {
          this.eventHandler.emit(`rpcResponse:${data.requestId}`, success[0]);
        } else {
          this.eventHandler.emit(`rpcResponse:${data.requestId}`, {
            jsonrpc: "2.0",
            id: 1,
            error: {
              code: -32603,
              message: "RPC-proxy error",
              data: "Unable to receive response from any provider",
            },
          });
        }
      }
    });
  }

  private async LoadProviders() {
    for (const rpc of this.rpcs) {
      const provider = new EthereumAPI(rpc, this.chainId, this.chainName);

      if (this.providers.length < this.maxProviderCount) {
        try {
          const chainId = await provider.getChainId();
          if (chainId !== this.chainId) {
            this.Logging(
              `ChainId mismatch. ${provider.endpointUrl} Expected: ${this.chainId}, received: ${chainId}`
            );
          } else {
            this.providers.push(provider);
          }
        } catch (error) {
          this.Logging(`Unable to init RPC, ${provider.endpointUrl}`, error);
        }
      }

      this.allProviders.push(provider);
    }
  }

  private NewProviderHandler() {
    this.eventHandler.on("rpcNode", (event) => {
      const uniqueProviders = new Set([
        ...this.allProviders.map((e) => e.endpointUrl),
      ]);

      if (event.chainId === this.chainId) {
        event.nodes.forEach(async (endpointUrl: string) => {
          if (!uniqueProviders.has(endpointUrl)) {
            const provider = new EthereumAPI(
              endpointUrl,
              this.chainId,
              this.chainName
            );
            this.allProviders.push(provider);
          }
        });
      }
    });
  }

  async FetchBlocks(): Promise<void> {
    if (this.providers.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.FetchBlocks();
    }

    try {
      if (this.latestBlock === 0) {
        await this.GetBlockNumber();
      }

      if (this.blockLag > 2 && this.GetFastestProvider()) {
        await this.GetNextBlock(this.latestBlock, this.GetFastestProvider());
      } else {
        await this.GetNextBlock(this.latestBlock);
      }
    } catch (error) {
      this.Logging(error, "Timeout", this.blockTime);
      await new Promise((resolve) => setTimeout(resolve, this.blockTime));
    } finally {
      return this.FetchBlocks();
    }
  }

  async GetNextBlock(blockNumber: number, forcedProvider?: EthereumAPI) {
    const time = Date.now();

    const blockFull = await this.GetBlockFull(blockNumber + 1, forcedProvider);

    if (blockFull.blockNumber > this.latestBlock) {
      this.Logging(
        "New block found",
        this.chainName,
        this.latestBlock,
        forcedProvider ? "fast track" : "",
        {
          requestTime: Date.now() - time,
          txCount: blockFull.transactions.length,
          logsCount: blockFull.txLogs.length,
        }
      );
      this.latestBlock = blockFull.blockNumber;
    }

    if (Date.now() - time > this.maxRequestTime) {
      this.RefreshProviders();
    }

    this.eventHandler.EmitBlock({
      ...blockFull,
    });
  }

  async GetBlockFull(blockNumber: number, forcedProvider?: EthereumAPI) {
    try {
      if (forcedProvider) {
        return forcedProvider.getFullBlock(blockNumber);
      }

      const promises = this.providers.map((provider) => {
        return provider.getFullBlock(blockNumber);
      });

      const { success, error } = await RequestMultiplePromisesWithTimeout(
        promises,
        this.maxRequestTime
      );

      const validated = success
        .filter(
          (e) => e?.number && e?.timestamp && e?.transactions && e?.txLogs
        )
        .sort((a, b) => b.txLogs?.length - a.txLogs?.length);

      const bestBlock = validated.find(
        (block) =>
          block?.number &&
          block?.timestamp &&
          block?.transactions?.length > 0 &&
          block?.txLogs?.length > 0
      );

      if (bestBlock) {
        return bestBlock;
      }

      if (validated[0]) {
        return validated[0];
      }
    } catch (error) {
      this.Logging("GetBlockFull error: ", error);
    }

    throw new Error(`No valid block found! Chain: ${this.chainName}`);
  }

  async CalculateBlockLag() {
    const promises = this.providers.map((provider) => {
      return provider.getBlockNumber();
    });

    const { success, error } = await RequestMultiplePromisesWithTimeout(
      promises,
      this.maxRequestTime
    );

    const latestBlock = GetConsensusValue(success);

    if (latestBlock) {
      this.blockLag = latestBlock - this.latestBlock;
    }

    this.Logging(`BlockLag on ${this.chainName}: `, this.blockLag, "block");
  }

  async GetBlockNumber() {
    const promises = this.providers.map((provider) => {
      return provider.getBlockNumber();
    });

    const { success, error } = await RequestMultiplePromisesWithTimeout(
      promises,
      this.maxRequestTime
    );

    const latestBlock = GetConsensusValue(success);

    if (latestBlock) {
      this.latestBlock = GetConsensusValue(success);
    } else {
      console.error("Error: ", "Cannot GetConsensusValue latestBlock");
    }

    this.Logging(
      "chainName ",
      this.chainName,
      success,
      GetConsensusValue(success)
    );
  }

  async CalculateBlockTime() {
    await this.GetBlockNumber();

    const blockNumber = this.latestBlock;

    const latestBlock = await this.GetBlockFull(blockNumber);
    const prevBlock = await this.GetBlockFull(blockNumber - 1);

    const blockTime = latestBlock.blockTimestamp - prevBlock.blockTimestamp;

    this.Logging(this.chainName, "blockTime set to: ", blockTime, " second");

    // BlockTime is UnixTimeStamp
    this.blockTime = blockTime * 1000;

    if (this.blockTime > 0) {
      this.intervalHandler = setInterval(async () => {
        try {
          await this.GetBlockFull(this.latestBlock);
          this.latestBlock = this.latestBlock + 1;
        } catch (error) {
          this.Logging(error);
        }
      }, this.blockTime);
    }
  }

  private GetFastestProvider() {
    const fasterProvider = this.providers
      .filter((e) => e.errorCount === 0)
      .sort((a, b) => a.latency - b.latency)?.[0];

    return fasterProvider ?? null;
  }

  private async RefreshProviders() {
    try {
      const availableProviders = this.allProviders.filter(
        (e) => !this.providers.find((k) => k.endpointUrl === e.endpointUrl)
      );

      if (availableProviders.length < 1) {
        this.Logging(this.chainName, "RefreshProviders done");
        return;
      }

      this.providers.forEach((e) => {
        this.Logging(
          e.endpointUrl,
          "latency: ",
          e.latency,
          "error: ",
          e.errorCount
        );
      });

      if (
        this.providers.filter((e) => e.errorCount > 0 || e.latency > 500)
          .length === 0
      ) {
        this.Logging(
          this.chainName,
          "RefreshProviders done, all provider satisfy latency and error limit"
        );
        return;
      }

      if (Math.random() > 0.5) {
        this.providers.sort((a, b) => a.errorCount - b.errorCount);
      } else {
        this.providers.sort((a, b) => a.latency - b.latency);
      }

      const nextProvider =
        availableProviders[
          Math.floor(Math.random() * availableProviders.length)
        ];

      try {
        await nextProvider.getFullBlock(this.latestBlock);

        const chainId = await nextProvider.getChainId();

        if (chainId !== this.chainId) {
          this.providers.pop();

          this.providers.push(nextProvider);
        }
      } catch (error) {
        throw error;
      }

      this.Logging(this.chainName, "RefreshProviders done");
    } catch (error) {
      this.Logging("RefreshProviders failed ", error);
    }
  }

  Logging(...args: any[]) {
    if (this.logging) {
      console.log(`[${this.chainName}]`, ...args);
    }
  }
}
