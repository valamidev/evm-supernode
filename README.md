# evm-supernode

Single Supernode for all EVM chain

### Under development! ** DO NOT USE IN PRODUCTION **

### Abstract:

Supernode allow to access to all EVM chain with one node. It's a proxy between client and EVM chain nodes.

### Features:

- Resilient RPC proxy compatible with Web3.js and EtherJS or any other JSON-RPC client
- Optimized for speed and low memory/cpu usage
- Broadcast Blocks and TransactionLogs on Websocket
- Use https://github.com/DefiLlama/chainlist to explore available EVM chains and public nodes
- Store Metadata about public nodes like latency, errors, rate limits

### Config:

```
    "proxyEnabled": true, // Proxy Mode On/Off
    "realTimeBlockFetch": false, // Fetch latest block with an interval needed for Websocket
    "websocketEnabled": false, // Allow to connect via websocket to the Supernode
    "websocketPort": 8080, // Websocket port
    "loggingEnabled": false, // Verbose logging
    "blockStoreEnabled": false, // Allow to store blocks (Experimental no rotation enabled yet)
    "nodeStorage": true, // Allow to store RPC Node metadata, improve restart speed and stability
    "enableWhitelist": false, // Allow only whitelisted chainIds to load
    "whitelistChains": [1,25,56,137,250,2000,42161,43114],
    "chainConfigs": {
        "1": {
            "name": "Ethereum",
            "blockTimeMs": 12000 // Default blocktime used to calculate optimal fetch interval for new blocks
        },
    }
```

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
