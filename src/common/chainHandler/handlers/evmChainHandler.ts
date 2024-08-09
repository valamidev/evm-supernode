import { EventHandler } from "../../../component/eventHandler";
import { LogLevel, MINUTE_IN_MS, SECOND_IN_MS } from "../../../constants";
import { Config } from "../../config";
import { EthereumAPI } from "../../evm/rpcClient";
import {
  RequestMultiplePromisesWithTimeout,
  RequestPromisesWithTimeout,
} from "../../promise/handler";

export class EvmChainHandler {
  private readonly maxProviderCount = 5;
  private readonly providers: EthereumAPI[] = [];
  private readonly allProviders: EthereumAPI[] = [];

  private maxRequestTime: number = 1500;
  private maxProxyRequestTime: number = 5000;
  private latestBlock: number = 0;

  private readonly eventHandler: EventHandler;
  private readonly logging: boolean | undefined;
  private readonly logLevel: number;
  private lastRequestTime: number = 0;

  constructor(
    private chainId: number,
    private chainName: string,
    private rpcs: string[]
  ) {
    this.eventHandler = EventHandler.getInstance();
    this.logging = Config.load()?.loggingEnabled;
    this.logLevel = Config.load()?.logLevel ?? 0;

    this.ProxyRequestHandlerInit();
    this.LoadProviders();
    this.NewProviderHandler();
  }

  public Start() {
    setInterval(() => {
      if (this.lastRequestTime > Date.now() - MINUTE_IN_MS) {
        this.RefreshProviders();
      }
    }, 15 * SECOND_IN_MS);
  }

  private async ProxyRequestHandlerInit() {
    this.eventHandler.on("rpcRequest", async (data) => {
      if (data.chainId === this.chainId) {
        this.lastRequestTime = Date.now();

        let response = undefined;

        // Fast Track
        try {
          const fastProvider = this.GetFastestProvider();

          const result = await RequestPromisesWithTimeout(
            fastProvider.ProxyRequest(data.body),
            this.maxRequestTime
          );

          this.ParseErrors(result);

          response = result;
        } catch (error) {
          if (this.logLevel >= LogLevel.Trace) {
            this.Logging("ProxyRequestHandler Fast Track failed", error);
          }
        }

        if (!response) {
          const promises = this.providers.map((provider) => {
            return provider.ProxyRequest(data.body);
          });

          const { success, error } = await RequestMultiplePromisesWithTimeout(
            promises,
            this.maxProxyRequestTime
          );

          for (const successResponse of success) {
            try {
              this.ParseErrors(successResponse);

              response = successResponse;
            } catch (error) {
              if (this.logLevel >= LogLevel.Trace) {
                this.Logging("ProxyRequestHandler Fast Track failed", error);
              }
            }
          }
        }

        if (response) {
          this.eventHandler.emit(`rpcResponse:${data.requestId}`, response);
        } else {
          this.eventHandler.emit(`rpcResponse:${data.requestId}`, {
            jsonrpc: "2.0",
            id: null,
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

  // Parse funny errors from providers
  private ParseErrors(payload: any) {
    if (!payload) {
      throw new Error("Unknown error, missing response");
    }

    if (payload.error) {
      throw new Error(payload.error?.message || "Unknown error");
    }

    if (payload.result?.code) {
      if (payload.result?.code !== 200) {
        throw new Error(payload.result?.message || "Unknown error");
      }
    }

    if (payload.result?.message) {
      if (
        payload.message?.includes("requests exceeded") ||
        payload.message?.includes("rate limit")
      ) {
        throw new Error(payload.result?.message);
      }
    }

    if (payload[0]) {
      this.ParseErrors(payload[0]);
    }
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
        } catch (error: any) {
          this.Logging(
            `Unable to init RPC, ${provider.endpointUrl}`,
            error.message
          );
          continue;
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

      this.RefreshProviders();
    });
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
        this.Logging(
          this.chainName,
          "RefreshProviders done, no available provider"
        );
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

        if (chainId === this.chainId) {
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
