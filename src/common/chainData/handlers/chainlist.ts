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

  // Fallback to last working version

  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/DefiLlama/chainlist/5e2fa1ff401f5e66ebd02b3828da7180c1a7e2f3/constants/chainIds.json"
    );
    const data = await response.json();

    return data;
  } catch (error) {
    console.error(error);
  }
};
