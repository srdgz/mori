import { afterAll, beforeAll, beforeEach } from "vitest";
import { rateLimiterContract } from "@/test/rate-limiter-contract";
import { DrizzleRateLimiter } from "./drizzle-rate-limiter";
import { rateLimits } from "./schema";
import { createTestDatabase, type TestDatabase } from "./testing";

let test: TestDatabase;

beforeAll(async () => {
  test = await createTestDatabase({ seed: false });
});

beforeEach(async () => {
  await test.db.delete(rateLimits);
});

afterAll(async () => {
  await test.client.close();
});

rateLimiterContract("DrizzleRateLimiter", (clock) => new DrizzleRateLimiter(test.db, clock));
