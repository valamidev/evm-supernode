import { ethers } from "ethers";

describe("Evm Proxy Test", () => {
  it("Highest block", async () => {
    const promises = [];

    for (let index = 0; index < 10; index++) {

      const provider = new ethers.JsonRpcProvider("https://localhost/chain/56");
      const provider2 = new ethers.JsonRpcProvider("https://localhost/chain/1");

      promises.push(provider.getFeeData())
      promises.push(provider2.getFeeData())
    }
  
    await Promise.all(promises);

    expect(true).toStrictEqual(true);
  }, 50000);
});


