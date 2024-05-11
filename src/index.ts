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

  const chainData = await chainDataService.getChainData();

  console.log("Chain data loaded...", chainData.length, " chain found");

  for (const chain of chainData) {
    const startNodes = await nodeStorage.findStartNodes(chain.chainId);

    const listener = ChainHandler.init(chain.chainId, chain.name, [
      ...startNodes.map((e) => e.rpcAddress),
      ...chain.rpcs,
    ]);

    listener.Start();
  }

  const proxy = new RpcProxy();

  console.log("EVM Supernode is running...");
};

Bootstrap()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
