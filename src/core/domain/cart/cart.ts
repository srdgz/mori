import { configureDrink, lineTotal, MAX_QUANTITY, type ConfiguredDrink } from "../catalog/configuration";
import type { OptionId } from "../catalog/options";
import type { Product, ProductId } from "../catalog/product";
import { DomainError } from "../shared/domain-error";
import { add, ZERO, type Money } from "../shared/money";

export type CartLine = Readonly<{ productId: ProductId; optionIds: readonly OptionId[]; quantity: number }>;

export type Cart = readonly CartLine[];

export type PricedLine = Readonly<{ line: CartLine; drink: ConfiguredDrink; total: Money }>;

export type CartIssue = Readonly<{ line: CartLine; reason: "not_found" | "unavailable" | "options_changed" }>;

export type PricedCart = Readonly<{ lines: readonly PricedLine[]; issues: readonly CartIssue[]; subtotal: Money; items: number }>;

export const MAX_LINES = 20;

export function lineKey(line: Pick<CartLine, "productId" | "optionIds">): string {
  return `${line.productId}:${[...line.optionIds].sort().join(",")}`;
}

function clamp(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(0, Math.trunc(quantity)));
}

export function addToCart(cart: Cart, line: CartLine): Cart {
  const key = lineKey(line);
  const existing = cart.find((l) => lineKey(l) === key);
  if (existing) return cart.map((l) => (l === existing ? { ...l, quantity: clamp(l.quantity + line.quantity) } : l));
  if (cart.length >= MAX_LINES) throw new DomainError("cart.full", `A cart holds at most ${MAX_LINES} lines`);
  return [...cart, { ...line, quantity: clamp(line.quantity) }].filter((l) => l.quantity > 0);
}

export function setQuantity(cart: Cart, key: string, quantity: number): Cart {
  return cart.map((l) => (lineKey(l) === key ? { ...l, quantity: clamp(quantity) } : l)).filter((l) => l.quantity > 0);
}

export function replaceOptions(cart: Cart, key: string, optionIds: readonly OptionId[]): Cart {
  const line = cart.find((l) => lineKey(l) === key);
  if (!line) return cart;
  return addToCart(
    cart.filter((l) => l !== line),
    { ...line, optionIds },
  );
}

export function mergeCarts(first: Cart, second: Cart): Cart {
  return second.reduce<Cart>(
    (cart, line) => (cart.length >= MAX_LINES && !cart.some((l) => lineKey(l) === lineKey(line)) ? cart : addToCart(cart, line)),
    first,
  );
}

function issueReason(error: unknown): CartIssue["reason"] {
  if (error instanceof DomainError && error.code === "catalog.product_unavailable") return "unavailable";
  if (error instanceof DomainError && error.code.startsWith("catalog.")) return "options_changed";
  throw error;
}

export function priceCart(cart: Cart, catalog: readonly Product[]): PricedCart {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const lines: PricedLine[] = [];
  const issues: CartIssue[] = [];
  for (const line of cart) {
    const product = byId.get(line.productId);
    if (!product) {
      issues.push({ line, reason: "not_found" });
      continue;
    }
    try {
      const drink = configureDrink(product, line.optionIds);
      lines.push({ line, drink, total: lineTotal(drink, line.quantity) });
    } catch (error) {
      issues.push({ line, reason: issueReason(error) });
    }
  }
  return {
    lines,
    issues,
    subtotal: lines.reduce((sum, l) => add(sum, l.total), ZERO),
    items: lines.reduce((sum, l) => sum + l.line.quantity, 0),
  };
}
