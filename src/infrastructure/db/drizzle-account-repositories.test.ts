import { afterAll, beforeAll } from "vitest";
import type { UserId } from "@/core/domain/access/actor";
import type { ProductId } from "@/core/domain/catalog/product";
import { accountRepositoriesContract } from "@/test/account-contract";
import { productSeed } from "../seed/catalog";
import { DrizzleAddressRepository, DrizzleFavouriteRepository } from "./drizzle-account-repositories";
import { users } from "./schema";
import { createTestDatabase, type TestDatabase } from "./testing";

let test: TestDatabase;
let counter = 0;

beforeAll(async () => {
  test = await createTestDatabase();
});

afterAll(async () => {
  await test.client.close();
});

accountRepositoriesContract("Drizzle", async () => {
  const created = await test.db
    .insert(users)
    .values([
      { name: "Ana", email: `ana${++counter}@example.com` },
      { name: "Eva", email: `eva${counter}@example.com` },
    ])
    .returning({ id: users.id });
  return {
    users: [created[0]!.id as UserId, created[1]!.id as UserId],
    addresses: new DrizzleAddressRepository(test.db),
    favourites: new DrizzleFavouriteRepository(test.db),
    products: [productSeed[0]!.id as ProductId, productSeed[1]!.id as ProductId],
  };
});
