import { EventHandler } from "../../component/eventHandler";
import { ChainListData } from "../../types";
import { fetchChainIds } from "./handlers/chainlist";
import { fetchExtraRpcs } from "./handlers/chainRpcList";

export class ChainDataService {
  eventHandler: EventHandler;
  constructor() {
    this.eventHandler = EventHandler.getInstance();

    setInterval(async () => {
      try {
        await this.refreshNodes();
      } catch (error) {
        console.log("Unable to refresh node list", error);
      }
    }, 1000 * 60 * 60);
  }

  async refreshNodes() {
    const chainDatas = await this.getChainData();

    for (const chain of chainDatas) {
      this.eventHandler.EmitRpcNodes({
        chainId: chain.chainId,
        nodes: chain.rpcs,
      });
    }
  }

  async getChainData(): Promise<ChainListData[]> {
    const chanIds = fetchChainIds;

    const rpcData = await fetchExtraRpcs();

    const mergedMap = Object.keys(rpcData).reduce((acc, key) => {
      return {
        ...acc,
        [key]: {
          ...rpcData[key],
          chainId: Number(key),
          name: (chanIds as any)[key] || null,
        },
      };
    }, {});

    const chainDatas = Object.values(mergedMap)
      .map((e: any) => ({
        ...e,
        rpcs: e.rpcs
          .map((r: any) => {
            if (r.url) {
              return r.url;
            }

            return r;
          })
          // Filter infura
          .filter((k: string) => !k.includes("infura.io"))
          // Fitler bsc-dataseed no Txlogs
          .filter((k: string) => !k.includes("bsc-dataseed"))
          // Filter out wss
          .filter((k: string) => !k.includes("wss://"))
          // Filter out ws
          .filter((k: string) => !k.includes("ws://"))
          // Shuffle the array
          .sort((a: any, b: any) => (Math.random() > 0.5 ? -1 : 1)),
      }))
      .filter((x: any) => x.name && x.rpcs.length >= 3);

    return chainDatas;
  }
}
