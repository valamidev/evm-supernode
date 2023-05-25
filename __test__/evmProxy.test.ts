import { ethers } from "ethers";

describe("Evm Proxy Test", () => {
  it("Highest block", async () => {


    const provider = new ethers.JsonRpcProvider("https://localhost/chain/56");

    const promises = [];

    for (let index = 0; index < 100; index++) {
      promises.push(provider.getFeeData())
    }
  
    await Promise.all(promises);

    expect(true).toStrictEqual(true);
  }, 50000);
});


