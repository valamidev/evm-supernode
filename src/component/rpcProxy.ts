import bodyParser from "body-parser";
import express, { Express } from "express";
import https from "https";
import fs from "fs";
import path from "path";
import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";
import { EventHandler } from "./eventHandler";

export class RpcProxy {
  app: Express;
  eventHandler: EventHandler;
  constructor() {
    this.eventHandler = EventHandler.getInstance();
    this.app = express();

    const httpsOptions = {
      key: fs.readFileSync(path.resolve(process.cwd(), "./assets/key.pem")),
      cert: fs.readFileSync(path.resolve(process.cwd(), "./assets/cert.pem")),
    };

    this.app.use(bodyParser.json());
    this.app.use(morgan("dev"));

    this.Start();

    https.createServer(httpsOptions, this.app).listen(443, () => {
      console.log("HTTPS server running on port 443");
    });
  }

  public Start() {
    this.app.post("/chain/:id", async (req, res) => {
      const { method, headers, body, params } = req;

      console.log({ method, params, headers, body });

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
