import dotenv from "dotenv";
dotenv.config();

import { ChainDataService } from "./common/chainData/chainData";
import { ChainHandler } from "./common/chainHandler/chainHandler";
import { EventHandler } from "./component/eventHandler";
import { Config } from "./common/config";
import EventEmitter from "node:events";

import { NodeStorageRepository } from "./component/nodeStorage";
import { RpcProxy } from "./common/rpcProxy/rpcProxy";

process.on("uncaughtException", function (err) {
  console.log("Caught exception: " + err, err.stack);
});

EventEmitter.defaultMaxListeners = 1000;

const Bootstrap = async () => {
  const config = Config.load();

  const eventHandler = EventHandler.getInstance();

  const nodeStorage = await NodeStorageRepository.init();

  const chainDataService = new ChainDataService();

  await chainDataService.start();

  console.log("RPC data loaded...");

  if (config.trustedNodes) {
    const chainIds = Object.keys(config.trustedNodes);

    for (const chainId of chainIds) {
      const rpcAddresses = config.trustedNodes[Number(chainId)];

      const listener = ChainHandler.init(Number(chainId), chainId, [
        ...rpcAddresses,
      ]);
    }
  } else {
    for (const chain of chainDataService.chainData) {
      const startNodes = await nodeStorage.findStartNodes(chain.chainId);

      const listener = ChainHandler.init(chain.chainId, chain.name, [
        ...startNodes.map((e) => e.rpcAddress),
        ...chain.rpcs,
      ]);

      listener.Start();
    }
  }

  const proxy = new RpcProxy();

  console.log("EVM Supernode is running...");
};

Bootstrap()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
