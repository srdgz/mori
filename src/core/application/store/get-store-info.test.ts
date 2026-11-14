import { describe, expect, it } from "vitest";
import { MemoryStoreRepository, storeSeed } from "@/infrastructure/memory/memory-store-repository";
import { makeGetStoreInfo } from "./get-store-info";

describe("GetStoreInfo", () => {
  it("returns the store details from the repository", async () => {
    const info = await makeGetStoreInfo(new MemoryStoreRepository())();
    expect(info).toBe(storeSeed);
    expect(info.schedule[1]).toEqual({ opens: "08:00", closes: "20:00" });
    expect(info.schedule[6]).toEqual({ opens: "09:30", closes: "20:30" });
  });
});
