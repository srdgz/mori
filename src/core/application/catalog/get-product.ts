import { relatedProducts, type Product } from "@/core/domain/catalog/product";
import type { CatalogRepository } from "../ports/catalog-repository";

export type ProductPage = { product: Product; related: Product[] };

export type GetProduct = (slug: string) => Promise<ProductPage | null>;

export function makeGetProduct(catalog: CatalogRepository): GetProduct {
  return async (slug) => {
    const products = await catalog.all();
    const product = products.find((p) => p.slug === slug);
    if (!product) return null;
    return { product, related: relatedProducts(product, products) };
  };
}
