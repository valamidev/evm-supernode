import bodyParser from "body-parser";
import express, { Express } from "express";
import https from "https";
import fs from "fs";
import path from "path";
import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";
import { EventHandler } from "../../component/eventHandler";
import { NodeStorageRepository } from "../../component/nodeStorage";

export class RpcProxy {
  app: Express;
  eventHandler: EventHandler;
  storage: NodeStorageRepository;
  constructor() {
    this.eventHandler = EventHandler.getInstance();
    this.app = express();
    this.storage = NodeStorageRepository.getInstance();

    const httpsOptions = {
      key: fs.readFileSync(path.resolve(process.cwd(), "./assets/key.pem")),
      cert: fs.readFileSync(path.resolve(process.cwd(), "./assets/cert.pem")),
    };

    this.app.use(bodyParser.json());

    if (process.env.STAGE === "dev") {
      this.app.use(morgan("dev"));
    }

    this.Start();

    https.createServer(httpsOptions, this.app).listen(443, () => {
      console.log("HTTPS server running on port 443");
    });
  }

  public Start() {
    // Pod Health status
    this.app.get("/health", (req, res) => {
      res.send("OK");
    });

    this.app.get("/nodes", async (req, res) => {
      const resp = await this.storage.findAll();

      res.send(JSON.stringify(resp.sort((a, b) => a.chainId - b.chainId)));
    });

    this.app.post("/chain/:id", async (req, res) => {
      const { method, headers, body, params } = req;

      if (process.env.STAGE === "dev") {
        console.log({ method, params, headers, body });
      }

      const requestId = uuidv4();

      this.eventHandler.emit("rpcRequest", {
        chainId: Number(params.id),
        body,
        requestId,
      });

      let finished = 0;

      this.eventHandler.once(`rpcResponse:${requestId}`, (data) => {
        this.eventHandler.removeAllListeners(`rpcResponse:${requestId}`);

        finished = 1;
        res.send(data);
        res.end();
      });

      setTimeout(() => {
        if (finished === 1) {
          return;
        }
        res.status(500).send("Request timeout");
        req.destroy();

        this.eventHandler.removeAllListeners(`rpcResponse:${requestId}`);
      }, 10000);
    });
  }
}
