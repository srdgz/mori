import { describe, expect, it } from "vitest";
import type { CatalogRepository } from "@/core/application/ports/catalog-repository";
import { configureDrink, defaultSelection } from "@/core/domain/catalog/configuration";
import { sortForMenu } from "@/core/domain/catalog/product";
import { catalogSeed } from "@/infrastructure/seed/catalog";

export function catalogRepositoryContract(name: string, repository: () => Promise<CatalogRepository> | CatalogRepository) {
  describe(`${name} (CatalogRepository contract)`, () => {
    it("returns the seeded menu with its option groups", async () => {
      const products = await (await repository()).all();
      expect(sortForMenu(products)).toEqual(sortForMenu(catalogSeed));
    });

    it("finds a product by slug", async () => {
      const product = await (await repository()).bySlug("coconut-matcha");
      expect(product?.name).toBe("Coconut Matcha");
      expect(product?.optionGroups.map((g) => g.code)).toEqual(["size", "temperature", "sweetness", "extras"]);
      expect(product?.optionGroups[1]?.options.map((o) => o.code)).toEqual(["iced"]);
    });

    it("returns null for an unknown slug", async () => {
      expect(await (await repository()).bySlug("hojicha")).toBeNull();
    });

    it("gives every product a default drink that can be ordered", async () => {
      const products = await (await repository()).all();
      for (const product of products) {
        expect(configureDrink(product, defaultSelection(product)).unitPrice).toEqual(product.price);
      }
    });
  });
}
