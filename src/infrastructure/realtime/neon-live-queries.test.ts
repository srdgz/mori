import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "../db/testing";
import { NeonLiveQuerySealer } from "./neon-live-queries";

let test: TestDatabase;
const secret = `nrt_live_1${randomBytes(32).toString("base64url")}`;

beforeAll(async () => {
  test = await createTestDatabase({ seed: false });
});

afterAll(async () => {
  await test.client.close();
});

describe("NeonLiveQuerySealer", () => {
  it("seals the events query of one order without touching the network", async () => {
    const sealer = new NeonLiveQuerySealer(test.db, "wss://realtime.example.test", { secret, database: "neondb" });
    const sealed = await sealer.sealOrder("00000000-0000-4000-8000-000000000001");
    expect(sealer.url).toBe("wss://realtime.example.test");
    expect(typeof sealed.capability).toBe("string");
    expect(sealed.capability).not.toContain("order_events");
    expect(sealed.expiresAt).toBeGreaterThan(Date.now());
    const other = await sealer.sealOrder("00000000-0000-4000-8000-000000000002");
    expect(other.queryFingerprint).not.toBe(sealed.queryFingerprint);
  });
});
