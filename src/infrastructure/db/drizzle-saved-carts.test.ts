import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CartLine } from "@/core/domain/cart/cart";
import { DrizzleSavedCartRepository } from "./drizzle-saved-carts";
import { users } from "./schema";
import { createTestDatabase, type TestDatabase } from "./testing";

let test: TestDatabase;
let userId: string;

beforeAll(async () => {
  test = await createTestDatabase({ seed: false });
  const [user] = await test.db.insert(users).values({ name: "Ana", email: "ana@example.com" }).returning({ id: users.id });
  userId = user!.id;
});

afterAll(async () => {
  await test.client.close();
});

describe("DrizzleSavedCartRepository", () => {
  it("returns an empty cart, then saves and replaces it", async () => {
    const repository = new DrizzleSavedCartRepository(test.db);
    const line = { productId: "p1", optionIds: ["o1"], quantity: 2 } as unknown as CartLine;
    expect(await repository.load(userId)).toEqual([]);
    await repository.save(userId, [line]);
    expect(await repository.load(userId)).toEqual([line]);
    await repository.save(userId, []);
    expect(await repository.load(userId)).toEqual([]);
  });
});
