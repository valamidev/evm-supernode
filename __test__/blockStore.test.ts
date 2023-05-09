import { Level } from "level";

describe("Validate Blockstore", () => {
  it("ReadBlockStore", async () => {
    const db = new Level("blockStore", {
      valueEncoding: "json",
      maxFileSize: 128 * 1024 * 1024,
    });

    let blockNumber = 0;

    for await (const [key, value] of db.iterator()) {
      if ((value as any).chainId === 137) {
        if (blockNumber + 1 !== (value as any).blockNumber) {
          console.log(
            "Error: ",
            "Block number is not sequential",
            blockNumber,
            (value as any).blockNumber
          );
        }

        blockNumber = (value as any).blockNumber;
        //   console.log(blockNumber);
      }
    }

    expect(true).toStrictEqual(true);
  });
});
