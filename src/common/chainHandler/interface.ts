import { EventHandler } from "../../component/eventHandler";
import { ChainConfig } from "../config";
import { EthereumAPI } from "../evm/rpcClient";

export abstract class EvmChainHandler {
  constructor(
    chainId: number,
    chainName: string,
    rpcs: string[],
    realTimeBlockFetch = true
  ) {}

  Start(): void {
    throw new Error("Method not implemented.");
  }
}
