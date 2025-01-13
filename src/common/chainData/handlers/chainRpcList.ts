export const fetchExtraRpcs = async () => {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/DefiLlama/chainlist/main/constants/extraRpcs.js"
    );
    const data = await response.text();

    const regex = /export const extraRpcs = ({[\s\S]*});/;
    const match = data.match(regex);

    if (match) {
      var privacyStatement = {};

      const rpcList = eval("(" + match[1] + ")");

      rpcList["1"].rpcs.push({
        url: "https://eth.llamarpc.com",
        tracking: "none",
        trackingDetails: "privacyStatement",
      });

      rpcList["137"].rpcs.push({
        url: "https://polygon.llamarpc.com",
        tracking: "none",
        trackingDetails: "privacyStatement",
      });

      return rpcList;
    } else {
      console.log("Extra RPCs not found in file.");
    }
  } catch (error) {
    console.error("Invalid RPC list file (up to date)", error);
  }

  // Fallback to last working version
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/DefiLlama/chainlist/ba823c899e2079743f3ee945f89c37f798eccb1b/constants/extraRpcs.js"
    );
    const data = await response.text();

    const regex = /export const extraRpcs = ({[\s\S]*});/;
    const match = data.match(regex);

    if (match) {
      var privacyStatement = {};

      const rpcList = eval("(" + match[1] + ")");

      rpcList["1"].rpcs.push({
        url: "https://eth.llamarpc.com",
        tracking: "none",
        trackingDetails: "privacyStatement",
      });

      rpcList["137"].rpcs.push({
        url: "https://polygon.llamarpc.com",
        tracking: "none",
        trackingDetails: "privacyStatement",
      });

      return rpcList;
    } else {
      console.log("Extra RPCs not found in fallback file.");
    }
  } catch (error) {
    console.error("Invalid RPC list file (fallback)", error);
  }
};
