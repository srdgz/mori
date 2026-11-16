import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { catalogRepositoryContract } from "@/test/catalog-contract";
import { seedDatabase } from "./seed";
import { DrizzleCatalogRepository } from "./drizzle-catalog-repository";
import { options, products } from "./schema";
import { createTestDatabase, type TestDatabase } from "./testing";

let test: TestDatabase;

beforeAll(async () => {
  test = await createTestDatabase();
});

afterAll(async () => {
  await test.client.close();
});

catalogRepositoryContract("DrizzleCatalogRepository", () => new DrizzleCatalogRepository(test.db));

describe("DrizzleCatalogRepository", () => {
  it("reflects availability changes made in the database", async () => {
    await test.db.update(products).set({ isAvailable: false }).where(eq(products.slug, "dirty-matcha"));
    await test.db.update(options).set({ isAvailable: false }).where(eq(options.code, "oat"));

    const repository = new DrizzleCatalogRepository(test.db);
    const dirty = await repository.bySlug("dirty-matcha");
    const classic = await repository.bySlug("classic-matcha");

    expect(dirty?.isAvailable).toBe(false);
    expect(classic?.optionGroups.find((g) => g.code === "milk")?.options.find((o) => o.code === "oat")?.isAvailable).toBe(false);

    await test.db.update(products).set({ isAvailable: true }).where(eq(products.slug, "dirty-matcha"));
    await test.db.update(options).set({ isAvailable: true }).where(eq(options.code, "oat"));
  });

  it("seeds idempotently without overwriting changes", async () => {
    await test.db.update(products).set({ basePriceCents: 470 }).where(eq(products.slug, "classic-matcha"));
    await seedDatabase(test.db);

    const classic = await new DrizzleCatalogRepository(test.db).bySlug("classic-matcha");
    expect(classic?.price.cents).toBe(470);
    expect(await test.db.$count(products)).toBe(6);

    await test.db.update(products).set({ basePriceCents: 450 }).where(eq(products.slug, "classic-matcha"));
  });
});
