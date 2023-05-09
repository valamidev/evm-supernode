import WebSocket from "ws";
import { GetChainData } from "../common/chainData/chainData";
import { ChainListener } from "../component/chainListener";
import { EventHandler } from "../component/eventHandler";
import { Config } from "../common/config";

import { Level } from "level";
import { NodeStorageRepository } from "../component/nodeStorage";

process.on("uncaughtException", function (err) {
  console.log("Caught exception: " + err);
});

const Bootstrap = async () => {
  const config = Config.load();

  const nodeStorage = await NodeStorageRepository.init();

  const chainData = await GetChainData();

  const eventHandler = EventHandler.getInstance();

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
    const db = new Level("blockStore", {
      valueEncoding: "json",
      maxFileSize: 128 * 1024 * 1024,
    });

    eventHandler.on("newBlock", async (data) => {
      await db.put(`${data.chainId}:${data.blockNumber}`, data);
    });
  }

  for (const chain of chainData) {
    if (config.allowedChains?.includes(chain.chainId)) {
      const startNodes = await nodeStorage.findStartNodes(chain.chainId);

      const listener = new ChainListener(chain.chainId, chain.name, [
        ...startNodes.map((e) => e.rpcAddress),
        ...chain.rpcs,
      ]);

      listener.Start();
      continue;
    }

    if (config.allowedChains?.length === 0) {
      const startNodes = await nodeStorage.findStartNodes(chain.chainId);

      const listener = new ChainListener(chain.chainId, chain.name, [
        ...startNodes.map((e) => e.rpcAddress),
        ...chain.rpcs,
      ]);

      listener.Start();
    }
  }

  console.log("EVM Block Relay is running...");
};

Bootstrap()
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });