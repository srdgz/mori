import type { Product } from "@/core/domain/catalog/product";

export interface CatalogRepository {
  all(): Promise<readonly Product[]>;
  bySlug(slug: string): Promise<Product | null>;
}
