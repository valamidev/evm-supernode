# EVM-Supernode

Single Supernode for all EVM chains. Supernode allows access to all EVM chains with a single node. It acts as a proxy between the client and EVM chain nodes. Written in Node.js and Typescript, it requires Node v16 or higher.

### Docker image available:
- https://hub.docker.com/r/valamidev/evm-supernode
```
docker run -p 443:443 evm-supernode:latest
```

### Features:

- Resilient RPC proxy compatible with Web3.js and EtherJS or any other JSON-RPC client
- Optimized for speed and low memory/CPU usage
- Broadcast Blocks and TransactionLogs on WebSocket
- Use https://github.com/DefiLlama/chainlist to explore available EVM chains and public nodes
- Store metadata about public nodes, such as latency, errors, and rate limits

### How to start:

```
# Rename config.default.json to config.json
# yarn install / npm install
# yarn start

# To improve security please add your own SSL cert under assets/ folder

```

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

### Service end-points:

```
# List of all nodes and metadata
https://localhost/nodes
/*
  [{
    "id": 29,
    "chainName": "ethereum",
    "chainId": 1,
    "rpcAddress": "https://eth-mainnet.nodereal.io/v1/1659dfb40aa24bbb8153a677b98064d7",
    "latency": 342,
    "errorCount": 2,
    "rateLimit": 2
  },
  ...]
*/

# Health status
https://localhost/health

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
