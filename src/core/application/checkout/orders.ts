import { actorFor, canViewOrder, GUEST } from "@/core/domain/access/actor";
import { mergeCarts, type Cart } from "@/core/domain/cart/cart";
import type { OrderRepository, OrderView } from "../ports/checkout";
import type { Identity } from "../ports/identity";

export interface SavedCartRepository {
  load(userId: string): Promise<Cart>;
  save(userId: string, cart: Cart): Promise<void>;
}

export function makeGetOrder(orders: OrderRepository, identity: Identity) {
  return async (code: string, trackingToken: string | null): Promise<OrderView | null> => {
    const order = await orders.byCode(code.toUpperCase());
    if (!order) return null;
    const user = await identity.currentUser();
    const actor = user ? actorFor(user) : GUEST;
    return canViewOrder(actor, order, trackingToken ?? undefined) ? order : null;
  };
}

export type SyncedCart = { owner: string; lines: Cart };

export function makeSyncCart(carts: SavedCartRepository, identity: Identity) {
  return async (local: Cart, owner: string | null): Promise<SyncedCart | null> => {
    const user = await identity.currentUser();
    if (!user) return null;
    const lines = owner === user.id ? local : mergeCarts(await carts.load(user.id), local);
    await carts.save(user.id, lines);
    return { owner: user.id, lines };
  };
}
