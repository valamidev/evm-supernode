# evm-supernode

Single Supernode for all EVM chain

### Under development! ** DO NOT USE IN PRODUCTION **

### Abstract:

Supernode allow to access to all EVM chain with one node. It's a proxy between client and EVM chain nodes.S

### Features:

- Resilient RPC proxy compatible with Web3.js and EtherJS or any other JSON-RPC client
- Optimized for speed and low memory/cpu usage
- Broadcast Blocks and TransactionLogs on Websocket
- Use DefiLlama/chainlist to explore available EVM chains and public nodes
- Store Metadata about public nodes like latency, errors, rate limits

### Use Proxy mode:

```
import { ethers } from "ethers";

// Avoid TLS error in case you are using self-signed certificate
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const provider = new ethers.JsonRpcProvider("https://localhost/chain/56"); // Binance Smart Chain
// const provider = new ethers.JsonRpcProvider("https://localhost/chain/1"); // Ethereum Mainnet
...

const number = await provider.getBlockNumber();

```
