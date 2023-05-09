export const fetchChainIds = async () => {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/DefiLlama/chainlist/main/constants/chainIds.json"
    );
    const data = await response.json();

    return data;
  } catch (error) {
    console.error(error);
  }
};
