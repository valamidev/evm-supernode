import fs from "fs";
import path from "path";

export class ChainConfig {
  name?: string;
  staticRpcAddresses?: string[];
  blockTimeMs?: number;
}

export class ConfigInterface {
  public websocketEnabled?: boolean;
  public websocketPort?: number;
  public blockStoreEnabled?: boolean;
  public loggingEnabled?: boolean;
  public allowedChains?: number[];
  public chainConfigs?: {
    [key: string]: ChainConfig;
  };
  public nodeAddresses?: string[];
}

export class Config implements ConfigInterface {
  private static instance: Config;

  private constructor() {}

  public static load(): ConfigInterface {
    if (!Config.instance) {
      Config.instance = new Config();

      const config = LoadConfig("config.json");

      Object.entries(config).forEach(([key, value]) => {
        (Config.instance as any)[key] = value;
      });
    }

    return Config.instance;
  }
}

export const LoadConfig = (configFile: string): ConfigInterface => {
  const configPath = path.resolve(process.cwd(), configFile);
  const configData = fs.readFileSync(configPath, "utf8");
  const config = JSON.parse(configData);

  return config as Config;
};
