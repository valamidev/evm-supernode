import bodyParser from "body-parser";
import express, { Express } from "express";
import https from "https";
import fs from "fs";
import path from "path";
import morgan from "morgan";

export class RpcProxy {
  app: Express;
  constructor() {
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

      res.send("Hello World!");
    });
  }
}
