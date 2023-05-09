import { Level } from "level";
import { EthereumAPI } from "./rpcClient";

describe("RpcClient", () => {
  const api = new EthereumAPI("https://cloudflare-eth.com", 1, "Ethereum");

  it("GetBlock", async () => {
    const result = await api.getFullBlock(17087316);

    console.log(result);

    console.log(Object.keys(result));

    expect(true).toStrictEqual(true);
  });
});
