import { DefaultChainHandler } from "./handlers/default";
import { EvmChainHandler } from "./interface";

export class ChainHandler {
  constructor() {}

  static init(
    chainId: number,
    chainName: string,
    rpcs: string[],
    realTimeBlockFetch = true
  ): EvmChainHandler {
    switch (chainId) {
      case 42161: // Arbitrum
        return new DefaultChainHandler(
          chainId,
          chainName,
          rpcs,
          realTimeBlockFetch
        );
      default:
        return new DefaultChainHandler(
          chainId,
          chainName,
          rpcs,
          realTimeBlockFetch
        );
    }
  }
}
