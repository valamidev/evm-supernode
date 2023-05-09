import { fetchChainIds } from "./chainlist";
import { fetchExtraRpcs } from "./chainRpcList";

export const GetChainData = async () => {
  const chanIds = await fetchChainIds();

  const rpcData = await fetchExtraRpcs();

  const mergedMap = Object.keys(rpcData).reduce((acc, key) => {
    return {
      ...acc,
      [key]: {
        ...rpcData[key],
        chainId: Number(key),
        name: chanIds[key] || null,
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
        // Shuffle the array
        .sort((a: any, b: any) => (Math.random() > 0.5 ? -1 : 1)),
    }))
    .filter((x: any) => x.name && x.rpcs.length >= 3);

  return chainDatas;
};
