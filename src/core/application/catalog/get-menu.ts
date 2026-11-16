import { sortForMenu, type Product } from "@/core/domain/catalog/product";
import type { CatalogRepository } from "../ports/catalog-repository";

export type GetMenu = (options?: { featuredOnly?: boolean }) => Promise<Product[]>;

export function makeGetMenu(catalog: CatalogRepository): GetMenu {
  return async ({ featuredOnly = false } = {}) => {
    const products = await catalog.all();
    const visible = products.filter((p) => p.isAvailable && (!featuredOnly || p.isFeatured));
    return sortForMenu(visible);
  };
}
