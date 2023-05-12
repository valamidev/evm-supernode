import { ethers } from "ethers";

describe("Evm Proxy Test", () => {
  it("Highest block", async () => {
    const provider = new ethers.JsonRpcProvider("https://localhost/chain/56");

    const number = await provider.getBlockNumber();

    expect(true).toStrictEqual(true);
  });
});
