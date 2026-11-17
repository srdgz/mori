import type { SavedCartRepository } from "@/core/application/checkout/orders";
import type { Cart } from "@/core/domain/cart/cart";

export class MemorySavedCartRepository implements SavedCartRepository {
  private readonly carts = new Map<string, Cart>();

  async load(userId: string): Promise<Cart> {
    return this.carts.get(userId) ?? [];
  }

  async save(userId: string, cart: Cart): Promise<void> {
    this.carts.set(userId, cart);
  }
}
