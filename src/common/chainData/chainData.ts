import { EventHandler } from "../../component/eventHandler";
import { ChainListData } from "../../types";
import { chainIdToName } from "./handlers/chainlist";
import { fetchErpcRpcList, fetchExtraRpcs } from "./handlers/chainRpcList";

const REFRESH_NODES_INTERVAL = 1000 * 60 * 60; // 1 hour

export class ChainDataService {
  eventHandler: EventHandler;
  chainData: ChainListData[];
  constructor() {
    this.eventHandler = EventHandler.getInstance();

    setInterval(async () => {
      try {
        await this.refreshNodes();
      } catch (error) {
        console.log("Unable to refresh node list", error);
      }
    }, REFRESH_NODES_INTERVAL);
  }

  async start() {
    await this.loadChainListData();
    await this.loadErpcData();
  }

  async refreshNodes() {
    await this.loadChainListData();

    for (const chain of this.chainData) {
      this.eventHandler.EmitRpcNodes({
        chainId: chain.chainId,
        nodes: chain.rpcs,
      });
    }
  }

  addToChainDataList(chainId: number, name: string, rpcs: string[]) {
    this.chainData = this.chainData || [];

    const existingChain = this.chainData.find(
      (chain) => chain.chainId === chainId
    );

    if (existingChain) {
      existingChain.rpcs = [...new Set([...existingChain.rpcs, ...rpcs])];
    } else {
      this.chainData.push({ chainId, name, rpcs });
    }
  }

  async loadErpcData(): Promise<void> {
    const rpcData = await fetchErpcRpcList();

    if (!rpcData) {
      console.log("No RPC data found from erpc");
      return;
    }

    for (const chain of Object.values(rpcData)) {
      const chainId = Number(chain.chainId);
      const chainName =
        (chainIdToName as any)[chain.chainId] || "Unknown chain - " + chainId;

      if (!chain.endpoints) {
        continue;
      }

      const filteredEndpoints = chain.endpoints
        .filter((k: string) => !k.includes("wss://"))
        // Filter out ws
        .filter((k: string) => !k.includes("ws://"));

      if (!filteredEndpoints?.length || filteredEndpoints?.length <= 2) {
        continue;
      }

      this.addToChainDataList(chainId, chainName, filteredEndpoints);
    }
  }

  async loadChainListData(): Promise<void> {
    const chanIds = chainIdToName;

    const rpcData = await fetchExtraRpcs();

    const mergedMap = Object.keys(rpcData).reduce((acc, key) => {
      return {
        ...acc,
        [key]: {
          ...rpcData[key],
          chainId: Number(key),
          name: (chanIds as any)[key] || "Unknown chain - " + key,
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
      .filter((x: any) => x.name);

    let i = 0;

    for (const chain of chainDatas) {
      if (!chain.rpcs?.length || chain.rpcs?.length <= 2) {
        continue;
      }

      i++;

      this.addToChainDataList(chain.chainId, chain.name, chain.rpcs);
    }

    console.log("Chainlist data loaded", i, "chains found");
  }
}
