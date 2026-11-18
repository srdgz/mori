import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newOrder } from "@/test/order-contract";
import { DrizzleOrderRepository } from "./drizzle-checkout-repositories";
import { DrizzlePushSubscriptions } from "./drizzle-push";
import { createTestDatabase, type TestDatabase } from "./testing";

let test: TestDatabase;

beforeAll(async () => {
  test = await createTestDatabase();
});

afterAll(async () => {
  await test.client.close();
});

describe("DrizzlePushSubscriptions", () => {
  it("keeps one row per order and device, updates keys and forgets a dead endpoint", async () => {
    const created = await new DrizzleOrderRepository(test.db).create(newOrder({ slotStart: new Date("2031-07-01T10:00:00Z") }));
    if (typeof created === "string") throw new Error(created);
    const subscriptions = new DrizzlePushSubscriptions(test.db);
    await subscriptions.add(created.id, { endpoint: "https://push.example/a", keys: { p256dh: "one", auth: "x" } });
    await subscriptions.add(created.id, { endpoint: "https://push.example/a", keys: { p256dh: "two", auth: "y" } });
    await subscriptions.add(created.id, { endpoint: "https://push.example/b", keys: { p256dh: "b", auth: "b" } });
    expect(await subscriptions.forOrder(created.id)).toEqual([
      { endpoint: "https://push.example/a", keys: { p256dh: "two", auth: "y" } },
      { endpoint: "https://push.example/b", keys: { p256dh: "b", auth: "b" } },
    ]);
    await subscriptions.remove("https://push.example/a");
    expect((await subscriptions.forOrder(created.id)).map((s) => s.endpoint)).toEqual(["https://push.example/b"]);
  });
});
