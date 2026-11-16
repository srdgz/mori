import { describe, expect, it } from "vitest";
import { MemoryCatalogRepository } from "@/infrastructure/memory/memory-catalog-repository";
import { catalogSeed } from "@/infrastructure/seed/catalog";
import { makeGetProduct } from "./get-product";

const getProduct = makeGetProduct(new MemoryCatalogRepository(catalogSeed));

describe("GetProduct", () => {
  it("returns the drink with three related drinks", async () => {
    const page = await getProduct("vanilla-matcha");
    expect(page?.product.name).toBe("Vanilla Matcha");
    expect(page?.related.map((p) => p.slug)).toEqual(["coconut-matcha", "dirty-matcha", "iced-mango-matcha"]);
  });

  it("still returns a sold-out drink so its page can say so", async () => {
    const soldOut = catalogSeed.map((p) => (p.slug === "dirty-matcha" ? { ...p, isAvailable: false } : p));
    const page = await makeGetProduct(new MemoryCatalogRepository(soldOut))("dirty-matcha");
    expect(page?.product.isAvailable).toBe(false);
  });

  it("returns null for an unknown drink", async () => {
    expect(await getProduct("hojicha")).toBeNull();
  });
});
