import express, { Express } from "express";
import compression from "compression";
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

    this.app.use(express.json());
    this.app.use(compression());

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
      let finished = 0;

      try {
        const { method, headers, body, params } = req;

        if (process.env.STAGE === "dev") {
          console.log({ method, params, headers, body });
        }

        const requestId = uuidv4();

        const timeoutHandler = setTimeout(() => {
          if (finished === 1) {
            return;
          }
          finished = 1;

          res.status(500).send("Request timeout");
          req.destroy();
          res.end();

          this.eventHandler.removeAllListeners(`rpcResponse:${requestId}`);

          return;
        }, 15_000);

        this.eventHandler.once(`rpcResponse:${requestId}`, (data) => {
          if (finished === 1) {
            return;
          }
          finished = 1;

          this.eventHandler.removeAllListeners(`rpcResponse:${requestId}`);

          clearTimeout(timeoutHandler);
          res.send(data);
          res.end();
          return;
        });

        this.eventHandler.emit("rpcRequest", {
          chainId: Number(params.id),
          body,
          requestId,
        });
      } catch (error) {
        finished = 1;

        console.log("Proxy response error", error);

        res.status(500).send("Request failed");
      }
    });
  }
}
