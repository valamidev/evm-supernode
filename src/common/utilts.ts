export const GetConsensusValue = (arr: number[]) => {
  const frequency = new Map();
  let maxCount = 0;
  let consensusValue = 0;

  if (arr.length === 0) {
    throw new Error("Cannot get consensus value of empty array");
  }

  for (const value of arr) {
    const count = frequency.get(value) || 0;
    frequency.set(value, count + 1);

    if (count + 1 > maxCount) {
      maxCount = count + 1;
      consensusValue = value;
    }
  }

  return consensusValue;
};
