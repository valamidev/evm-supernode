process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const ethers = require('ethers');

const batchSize = 10;
const numRequests = 1000;
const chainId = 56; // replace with the desired chain ID


async function makeRequests() {

    let requestId = 1;

  for (let i = 0; i < numRequests; i += batchSize) {
    const requests = [];
    for (let j = i; j < i + batchSize && j < numRequests; j++) {
        const provider = new ethers.JsonRpcProvider(`https://localhost/chain/${chainId}`);
        requests.push(provider.getLogs({
          fromBlock: 'latest',
          toBlock: 'latest',
        }));

    }
   const result = await Promise.all(requests);

   console.log(result[0]);
  }



}

makeRequests();