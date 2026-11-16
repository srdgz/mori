import type { CatalogRepository } from "@/core/application/ports/catalog-repository";
import type { Product } from "@/core/domain/catalog/product";

export class MemoryCatalogRepository implements CatalogRepository {
  constructor(private readonly products: readonly Product[]) {}

  async all(): Promise<readonly Product[]> {
    return this.products;
  }

  async bySlug(slug: string): Promise<Product | null> {
    return this.products.find((p) => p.slug === slug) ?? null;
  }
}
