import fs from "fs";
import path from "path";

export class ChainConfig {
  name?: string;
  staticRpcAddresses?: string[];
  blockTimeMs?: number;
}

export class ConfigInterface {
  public realTimeBlockFetch?: boolean;
  public blockStoreEnabled?: boolean;
  public loggingEnabled?: boolean;
  public logLevel?: number;
  public trustedNodes?: Record<number, string[]>;
  public allowedNetwork?: number[];
}

export class Config implements ConfigInterface {
  private static instance: Config;

  private constructor() {}

  public static load(): ConfigInterface {
    try {
      if (!Config.instance) {
        Config.instance = new Config();

        let config: ConfigInterface = {};

        try {
          config = LoadConfig("config.json");
        } catch (error) {
          console.log(
            "No config.json found, fallback to config.default.config"
          );

          config = LoadConfig("config.default.json");
        }

        Object.entries(config).forEach(([key, value]) => {
          (Config.instance as any)[key] = value;
        });
      }

      return Config.instance;
    } catch (error) {
      console.log("No valid configuration found!");

      console.error(error);

      process.exit(1);
    }
  }
}

export const LoadConfig = (configFile: string): ConfigInterface => {
  const configPath = path.resolve(process.cwd(), configFile);
  const configData = fs.readFileSync(configPath, "utf8");
  const config = JSON.parse(configData);

  return config as Config;
};
