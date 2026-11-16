import type { LocalizedText } from "../shared/locale";
import type { Money } from "../shared/money";

export type ProductId = string & { readonly __brand: "ProductId" };

export type Product = Readonly<{
  id: ProductId;
  slug: string;
  name: string;
  imageKey: string;
  price: Money;
  cupColor: string;
  cupName: LocalizedText;
  shortDescription: LocalizedText;
  description: LocalizedText;
  alt: LocalizedText;
  tags: readonly LocalizedText[];
  isAvailable: boolean;
  isFeatured: boolean;
  sort: number;
}>;

export function sortForMenu(products: readonly Product[]): Product[] {
  return [...products].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
}
