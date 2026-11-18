import { afterAll, beforeAll } from "vitest";
import { adminCatalogContract } from "@/test/admin-catalog-contract";
import { DrizzleAdminCatalogRepository } from "./drizzle-admin-catalog";
import { createTestDatabase, type TestDatabase } from "./testing";

let test: TestDatabase;

beforeAll(async () => {
  test = await createTestDatabase();
});

afterAll(async () => {
  await test.client.close();
});

adminCatalogContract("DrizzleAdminCatalogRepository", async () => {
  const catalog = new DrizzleAdminCatalogRepository(test.db);
  const [category] = await catalog.categories();
  const [group] = await catalog.optionGroups();
  return { catalog, categoryId: category!.id, groupId: group!.id, optionId: group!.options[0]!.id };
});
