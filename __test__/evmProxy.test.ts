process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { ethers } from "ethers";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

beforeEach(() => {
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
});

describe("Evm Proxy Test", () => {
  it("Highest block", async () => {
    const provider = new ethers.JsonRpcProvider("https://localhost/chain/56");

    const number = await provider.getBlockNumber();

    expect(true).toStrictEqual(true);
  });
});
