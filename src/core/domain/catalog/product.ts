import type { LocalizedText } from "../shared/locale";
import type { Money } from "../shared/money";
import type { OptionGroup } from "./options";

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
  isVegan: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  sort: number;
  optionGroups: readonly OptionGroup[];
}>;

export function sortForMenu(products: readonly Product[]): Product[] {
  return [...products].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
}

export function relatedProducts(product: Product, menu: readonly Product[], limit = 3): Product[] {
  const others = sortForMenu(menu.filter((p) => p.id !== product.id && p.isAvailable));
  const index = others.findIndex((p) => p.sort > product.sort);
  const start = index === -1 ? 0 : index;
  return [...others.slice(start), ...others.slice(0, start)].slice(0, limit);
}
