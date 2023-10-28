import dotenv from "dotenv";
dotenv.config();

import fs from "fs";

import WebSocket from "ws";
import { ChainDataService } from "./common/chainData/chainData";
import { ChainHandler } from "./common/chainHandler/chainHandler";
import { EventHandler } from "./component/eventHandler";
import { Config } from "./common/config";

import { NodeStorageRepository } from "./component/nodeStorage";
import { RpcProxy } from "./common/rpcProxy/rpcProxy";

process.on("uncaughtException", function (err) {
  console.log("Caught exception: " + err, err.stack);
});

const Bootstrap = async () => {
  const config = Config.load();

  const eventHandler = EventHandler.getInstance();

  const nodeStorage = await NodeStorageRepository.init();

  const chainDataService = new ChainDataService();

  const chainData = await chainDataService.getChainData();

  console.log("Chain data loaded...", chainData.length, " chain found");

  if (config.websocketEnabled) {
    const server = new WebSocket.Server({
      port: config?.websocketPort ?? 8080,
    });

    server.on("connection", (socket) => {
      console.log("Client connected");

      eventHandler.on("newBlock", (data) => {
        socket.send(
          JSON.stringify({
            event: `newBlock:${data.chainId}`,
            data,
          })
        );
      });

      socket.on("close", () => {
        console.log("Client disconnected");
      });
    });

    console.log("Websocket is running...");
  }

  if (config.blockStoreEnabled) {
    eventHandler.on("newBlock", async (data) => {
      const dir = `blocks/${data.chainId}`;
      const filename = `${dir}/${data.blockNumber}.json`;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFile(filename, JSON.stringify(data), (err) => {
        if (err) {
          console.log(err);
        }
      });
    });
  }

  for (const chain of chainData) {
    if (config.enableWhitelist) {
      if (config.whitelistChains?.includes(chain.chainId)) {
        const startNodes = await nodeStorage.findStartNodes(chain.chainId);

        const listener = ChainHandler.init(
          chain.chainId,
          chain.name,
          [...startNodes.map((e) => e.rpcAddress), ...chain.rpcs],
          config.realTimeBlockFetch
        );

        listener.Start();
        continue;
      }
    } else {
      const startNodes = await nodeStorage.findStartNodes(chain.chainId);

      const listener = ChainHandler.init(chain.chainId, chain.name, [
        ...startNodes.map((e) => e.rpcAddress),
        ...chain.rpcs,
      ]);

      listener.Start();
    }
  }

  if (config.proxyEnabled) {
    const proxy = new RpcProxy();
  }

  console.log("EVM Supernode is running...");
};

Bootstrap()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
