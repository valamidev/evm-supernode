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

      return rpcList;
    } else {
      console.log("Extra RPCs not found in file.");
    }
  } catch (error) {
    console.error(error);
  }

  // Fallback to last working version
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/DefiLlama/chainlist/b9857beb81d48c041ad906a6bb51e4b36fc58186/constants/extraRpcs.js"
    );
    const data = await response.text();

    const regex = /export const extraRpcs = ({[\s\S]*});/;
    const match = data.match(regex);

    if (match) {
      var privacyStatement = {};

      const rpcList = eval("(" + match[1] + ")");

      return rpcList;
    } else {
      console.log("Extra RPCs not found in file.");
    }
  } catch (error) {
    console.error(error);
  }
};
