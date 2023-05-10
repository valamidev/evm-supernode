import { NodeStorageRepository } from "../../component/nodeStorage";
import { RequestPromisesWithTimeout } from "../promise/handler";

export class EthereumAPI {
  private storage: NodeStorageRepository;
  public latency: number = 0;
  public errorCount: number = 0;
  public rateLimited: number = 0;
  private maxRequestTime: number = 1500;
  private requestTimes: number[] = [];

  constructor(
    public endpointUrl: string,
    private chainId: number,
    private chainName: string
  ) {
    this.storage = NodeStorageRepository.getInstance();
  }

  public ProxyRequest = async (body: any) => {
    const startTime = Date.now();

    try {
      const response = await RequestPromisesWithTimeout(
        fetch(this.endpointUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }),
        this.maxRequestTime
      );

      const json = await response.json();

      if (json.error) {
        this.errorCount++;

        if (json.error.message?.includes("usage limit")) {
          this.rateLimited++;
        }

        if (json.error.message?.includes("limit exceeded")) {
          this.rateLimited++;
        }
        if (json.error.message?.includes("reached")) {
          this.rateLimited++;
        }
        if (json.error.message?.includes("Too Many Requests")) {
          this.rateLimited++;
        }
      }

      this.latency = Date.now() - startTime;
      this.requestTimes.push(this.latency);

      // Keep only the last 10 request times
      if (this.requestTimes.length > 10) {
        this.requestTimes.shift();
      }

      this.LogPerf();

      return response;
    } catch (error) {
      this.errorCount++;

      throw error;
    }
  };

  private async MakeMultiRequest(
    requests: { method: string; params: any[] }[]
  ) {
    const startTime = Date.now();

    try {
      const response = await RequestPromisesWithTimeout(
        fetch(this.endpointUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            requests.map((request, index) => ({
              jsonrpc: "2.0",
              id: index + 1,
              method: request.method,
              params: request.params,
            }))
          ),
        }),
        this.maxRequestTime
      );

      const json = await response.json();

      if (json.error) {
        this.errorCount++;

        if (json.error.message?.includes("usage limit")) {
          this.rateLimited++;
        }

        if (json.error.message?.includes("limit exceeded")) {
          this.rateLimited++;
        }
        if (json.error.message?.includes("reached")) {
          this.rateLimited++;
        }
        if (json.error.message?.includes("Too Many Requests")) {
          this.rateLimited++;
        }

        throw new Error(json.error.message);
      }

      this.latency = Date.now() - startTime;
      this.requestTimes.push(this.latency);

      // Keep only the last 10 request times
      if (this.requestTimes.length > 10) {
        this.requestTimes.shift();
      }

      this.LogPerf();

      return json.map((response: any) => response.result);
    } catch (error) {
      this.errorCount++;

      throw error;
    }
  }

  private async MakeRequest(method: string, params: any[]) {
    const startTime = Date.now();

    try {
      const response = await fetch(this.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method,
          params,
        }),
      });

      const json = await response.json();

      if (json.error) {
        this.errorCount++;

        if (json.error.message?.includes("usage limit")) {
          this.rateLimited++;
        }

        if (json.error.message?.includes("limit exceeded")) {
          this.rateLimited++;
        }
        if (json.error.message?.includes("reached")) {
          this.rateLimited++;
        }
        if (json.error.message?.includes("Too Many Requests")) {
          this.rateLimited++;
        }

        throw new Error(json.error.message);
      }

      this.latency = Date.now() - startTime;
      this.requestTimes.push(this.latency);

      // Keep only the last 10 request times
      if (this.requestTimes.length > 10) {
        this.requestTimes.shift();
      }

      this.LogPerf();

      return json.result;
    } catch (error) {
      this.errorCount++;

      throw error;
    }
  }

  async getFullBlock(blockNumber: number) {
    const result = await this.MakeMultiRequest([
      {
        method: "eth_getBlockByNumber",
        params: [`0x${blockNumber.toString(16)}`, true],
      },
      {
        method: "eth_getLogs",
        params: [
          {
            fromBlock: `0x${blockNumber.toString(16)}`,
            toBlock: `0x${blockNumber.toString(16)}`,
          },
        ],
      },
    ]);

    try {
      parseInt(result[0].number, 16);
      parseInt(result[0].timestamp, 16);
    } catch (error) {
      this.errorCount++;
    }

    return {
      chainId: this.chainId,
      blockNumber: parseInt(result[0].number, 16),
      blockTimestamp: parseInt(result[0].timestamp, 16),
      ...result[0],
      txLogs: result[1],
    };
  }

  async getBlockNumber() {
    return parseInt(await this.MakeRequest("eth_blockNumber", []), 16);
  }

  async getBalance(address: string) {
    return parseInt(
      await this.MakeRequest("eth_getBalance", [address, "latest"]),
      16
    );
  }

  async getBlock(blockNumber?: number) {
    /*
        [
      'baseFeePerGas',   'difficulty',
      'extraData',       'gasLimit',
      'gasUsed',         'hash',
      'logsBloom',       'miner',
      'mixHash',         'nonce',
      'number',          'parentHash',
      'receiptsRoot',    'sha3Uncles',
      'size',            'stateRoot',
      'timestamp',       'totalDifficulty',
      'transactions',    'transactionsRoot',
      'uncles',          'withdrawals',
      'withdrawalsRoot'
    ]
    */

    return await this.MakeRequest("eth_getBlockByNumber", [
      blockNumber ? `0x${blockNumber.toString(16)}` : "latest",
      true,
    ]);
  }

  async getLogs(fromBlock?: number, toBlock?: number) {
    return await this.MakeRequest("eth_getLogs", [
      {
        fromBlock: fromBlock ? `0x${fromBlock.toString(16)}` : "latest",
        toBlock: toBlock ? `0x${toBlock.toString(16)}` : "latest",
      },
    ]);
  }

  private async LogPerf() {
    const averageLatency =
      this.requestTimes.reduce((sum, t) => sum + t, 0) /
      this.requestTimes.length;

    this.storage
      .upsert({
        chainName: this.chainName,
        chainId: this.chainId,
        rpcAddress: this.endpointUrl,
        latency: averageLatency,
        errorCount: this.errorCount,
        rateLimit: this.rateLimited,
      })
      .catch((e) => console.log(e));
  }
}
