process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const ethers = require("ethers");

const batchSize = 10;
const numRequests = 50000;
const chainId = 56; // replace with the desired chain ID

async function makeRequests() {
  let requestId = 1;

  for (let i = 0; i < numRequests; i += batchSize) {
    const requests = [];
    for (let j = i; j < i + batchSize && j < numRequests; j++) {
      const provider = new ethers.JsonRpcProvider(
        `https://localhost/chain/${chainId}`
      );

      //  requests.push(provider.getFeeData());

      requests.push(
        provider.getLogs({
          fromBlock: "latest",
          toBlock: "latest",
        })
      );
    }
    const result = await Promise.all(requests);

    if (!result[0]) {
      console.log("Error invalid repsonse", result[0]);
    }

    if (!result?.[0]?.[0]?.transactionHash) {
      console.log("Error invalid repsonse", result[0]);
    }
  }
}

const time = Date.now();

console.log("Starting requests");
makeRequests().then(() => {
  console.log(
    "Finished requests",
    numRequests,
    "Time: ",
    Date.now() - time,
    "ms"
  );
});
