import { addToCart, MAX_LINES, type Cart } from "../cart/cart";
import { configureDrink } from "../catalog/configuration";
import type { OptionId } from "../catalog/options";
import type { Product } from "../catalog/product";
import { DomainError } from "../shared/domain-error";

export type PastLine = Readonly<{
  productId: string;
  productName: string;
  options: readonly Readonly<{ group: string; code: string }>[];
  quantity: number;
}>;

export type Reorder = Readonly<{ lines: Cart; skipped: readonly string[] }>;

function optionIdsFor(product: Product, line: PastLine): OptionId[] | null {
  const ids: OptionId[] = [];
  for (const wanted of line.options) {
    const option = product.optionGroups.find((g) => g.code === wanted.group)?.options.find((o) => o.code === wanted.code);
    if (!option) return null;
    ids.push(option.id);
  }
  return ids;
}

function fits(product: Product, optionIds: OptionId[]): boolean {
  try {
    configureDrink(product, optionIds);
    return true;
  } catch (error) {
    if (error instanceof DomainError) return false;
    throw error;
  }
}

export function reorderLines(past: readonly PastLine[], catalog: readonly Product[]): Reorder {
  const byId = new Map(catalog.map((p) => [p.id as string, p]));
  let lines: Cart = [];
  const skipped: string[] = [];
  for (const line of past) {
    const product = byId.get(line.productId);
    const optionIds = product ? optionIdsFor(product, line) : null;
    if (!product || !optionIds || !fits(product, optionIds) || lines.length >= MAX_LINES) {
      if (!skipped.includes(line.productName)) skipped.push(line.productName);
      continue;
    }
    lines = addToCart(lines, { productId: product.id, optionIds, quantity: line.quantity });
  }
  return { lines, skipped };
}
