import { EventHandler } from "../../../component/eventHandler";
import { LogLevel, MINUTE_IN_MS, SECOND_IN_MS } from "../../../constants";
import { Config } from "../../config";
import { EthereumAPI } from "../../evm/rpcClient";
import {
  RequestMultiplePromisesWithTimeout,
  RequestPromisesWithTimeout,
} from "../../promise/handler";

export class EvmChainHandler {
  private readonly maxProviderCount = 6;
  private readonly providers: EthereumAPI[] = [];
  private readonly allProviders: EthereumAPI[] = [];

  private maxFastRequestTime: number = 1500;
  private maxProxyRequestTime: number = 5000;
  private latestBlock: number = 0;

  private readonly eventHandler: EventHandler;
  private readonly logging: boolean | undefined;
  private readonly logLevel: number;
  private lastRequestTime: number = 0;

  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

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

  private NewProviderHandler() {
    this.eventHandler.on("rpcNode", (event) => {
      if (event.chainId !== this.chainId) {
        return;
      }

      const uniqueProviders = new Set([...this.rpcs.map((e) => e)]);

      event.nodes.forEach(async (endpointUrl: string) => {
        if (!uniqueProviders.has(endpointUrl)) {
          this.rpcs.push(endpointUrl);
        }
      });

      this.RefreshAllProviders();

      this.RefreshProviders();
    });
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
        let response = await this.tryFastTrack(data.body);

        if (!response) {
          response = await this.tryAllProviders(data.body);
        }

        this.emitResponse(data.requestId, response);
      }
    });
  }

  private async tryFastTrack(body: any): Promise<any> {
    try {
      const fastProvider = this.GetFastestProvider();
      if (!fastProvider) return null;

      const result = await this.retryRequest(
        () => fastProvider.ProxyRequest(body),
        this.maxFastRequestTime
      );
      this.ParseErrors(result);
      return result;
    } catch (error) {
      this.logTrace("ProxyRequestHandler Fast Track failed", error);
      return null;
    }
  }

  private async tryAllProviders(body: any): Promise<any> {
    const promises = this.providers.map((provider) =>
      provider.ProxyRequest(body)
    );

    const { success } = await RequestMultiplePromisesWithTimeout(
      promises,
      this.maxProxyRequestTime
    );

    for (const response of success) {
      try {
        this.ParseErrors(response);
        return response;
      } catch (error) {
        this.logTrace("Provider response failed validation", error);
      }
    }
    return null;
  }

  private emitResponse(requestId: string, response: any) {
    if (response) {
      this.eventHandler.emit(`rpcResponse:${requestId}`, response);
    } else {
      this.eventHandler.emit(`rpcResponse:${requestId}`, {
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

  private async retryRequest<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await RequestPromisesWithTimeout(fn(), timeout);
      } catch (error) {
        if (i === this.maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
      }
    }
    throw new Error("Max retries reached");
  }

  private logTrace(message: string, error: any) {
    if (this.logLevel >= LogLevel.Trace) {
      this.Logging(message, error);
    }
  }

  // Parse funny errors from providers
  private ParseErrors(payload: any) {
    if (!payload) {
      throw new Error("Unknown error, missing response");
    }

    if (payload.error && !payload.error?.data) {
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
    for (const rpc of this.rpcs.sort(() => Math.random() - 0.5)) {
      try {
        const provider = new EthereumAPI(rpc, this.chainId, this.chainName);

        const chainId = await provider.getChainId();
        if (chainId === this.chainId) {
          // Only keep 5 providers for processing
          if (this.providers.length < this.maxProviderCount) {
            this.providers.push(provider);
          }
          this.allProviders.push(provider);
        }
      } catch (error: any) {
        this.Logging(`Unable to init RPC, ${rpc}`, error.message);
      }
    }

    this.Logging(
      `Chain ${this.chainName} initialized with ${this.allProviders.length} providers from ${this.rpcs.length} endpoints.`
    );
  }

  private async RefreshAllProviders() {
    const uniqueProviders = new Set([
      ...this.allProviders.map((e) => e.endpointUrl),
    ]);

    for (const rpc of this.rpcs) {
      // Already known rpc
      if (!uniqueProviders.has(rpc)) {
        continue;
      }

      try {
        const provider = new EthereumAPI(rpc, this.chainId, this.chainName);

        const chainId = await provider.getChainId();
        if (chainId !== this.chainId) {
          this.Logging(
            `ChainId mismatch. ${provider.endpointUrl} Expected: ${this.chainId}, received: ${chainId}`
          );
        } else {
          this.allProviders.push(provider);
        }
      } catch (error: any) {
        this.Logging(`Unable to init RPC, ${rpc}`, error.message);
      }
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
          if (this.providers.length === this.maxProviderCount) {
            this.providers.pop();
          }

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
