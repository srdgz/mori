import { afterAll, beforeAll } from "vitest";
import type { UserId } from "@/core/domain/access/actor";
import { reviewRepositoryContract } from "@/test/review-contract";
import { DrizzleOrderRepository } from "./drizzle-checkout-repositories";
import { DrizzleReviewRepository } from "./drizzle-reviews";
import { reviews, users } from "./schema";
import { createTestDatabase, type TestDatabase } from "./testing";

let test: TestDatabase;
let buyer: UserId;
let other: UserId;

beforeAll(async () => {
  test = await createTestDatabase();
  const created = await test.db
    .insert(users)
    .values([
      { name: "Lucía Martín", email: "lucia-reviews@example.com" },
      { name: "Kai", email: "kai-reviews@example.com" },
    ])
    .returning({ id: users.id });
  buyer = created[0]!.id as UserId;
  other = created[1]!.id as UserId;
});

afterAll(async () => {
  await test.client.close();
});

reviewRepositoryContract("DrizzleReviewRepository", async () => {
  await test.db.delete(reviews);
  return { reviews: new DrizzleReviewRepository(test.db), orders: new DrizzleOrderRepository(test.db), buyer, other };
});
