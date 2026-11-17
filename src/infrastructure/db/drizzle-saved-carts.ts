import { eq } from "drizzle-orm";
import type { SavedCartRepository } from "@/core/application/checkout/orders";
import type { Cart, CartLine } from "@/core/domain/cart/cart";
import type { Database } from "./database";
import { carts } from "./schema";

export class DrizzleSavedCartRepository implements SavedCartRepository {
  constructor(private readonly db: Database) {}

  async load(userId: string): Promise<Cart> {
    const [row] = await this.db.select({ lines: carts.lines }).from(carts).where(eq(carts.userId, userId));
    return Array.isArray(row?.lines) ? (row.lines as CartLine[]) : [];
  }

  async save(userId: string, cart: Cart): Promise<void> {
    await this.db
      .insert(carts)
      .values({ userId, lines: cart })
      .onConflictDoUpdate({ target: carts.userId, set: { lines: cart, updatedAt: new Date() } });
  }
}
