import type { CartLine } from "../cart/cart";
import { configureDrink, defaultSelection } from "../catalog/configuration";
import type { Product } from "../catalog/product";
import type { FulfilmentKind, OrderStatus } from "./order-status";

const MINUTES_IN_STEP: Partial<Record<OrderStatus, number>> = {
  received: 4,
  preparing: 8,
  ready: 12,
  out_for_delivery: 15,
};

export function demoStep(status: OrderStatus, fulfilment: FulfilmentKind, minutesInStatus: number): OrderStatus | null {
  const wait = MINUTES_IN_STEP[status];
  if (wait === undefined || minutesInStatus < wait) return null;
  if (status === "received") return "preparing";
  if (status === "preparing") return fulfilment === "pickup" ? "ready" : "out_for_delivery";
  return "completed";
}

export function demoLines(menu: readonly Product[], random: () => number): CartLine[] {
  const orderable = menu.filter((product) => {
    try {
      configureDrink(product, defaultSelection(product));
      return true;
    } catch {
      return false;
    }
  });
  if (orderable.length === 0) return [];
  const count = random() < 0.6 ? 1 : 2;
  const picked = new Map<string, CartLine>();
  for (let i = 0; i < count; i++) {
    const product = orderable[Math.floor(random() * orderable.length) % orderable.length]!;
    const quantity = 1 + (Math.floor(random() * 3) % 3);
    const current = picked.get(product.id);
    picked.set(product.id, {
      productId: product.id,
      optionIds: defaultSelection(product),
      quantity: Math.min(20, (current?.quantity ?? 0) + quantity),
    });
  }
  return [...picked.values()];
}
