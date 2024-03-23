import { EvmChainHandler } from "./handlers/evmChainHandler";

export class ChainHandler {
  constructor() {}

  static init(
    chainId: number,
    chainName: string,
    rpcs: string[]
  ): EvmChainHandler {
    return new EvmChainHandler(chainId, chainName, rpcs);
  }
}
