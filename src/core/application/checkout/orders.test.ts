import { beforeEach, describe, expect, it } from "vitest";
import type { CartLine } from "@/core/domain/cart/cart";
import type { OptionId } from "@/core/domain/catalog/options";
import type { ProductId } from "@/core/domain/catalog/product";
import { MemoryOrderRepository } from "@/infrastructure/memory/memory-checkout";
import { MemoryIdentity } from "@/infrastructure/memory/memory-identity";
import { MemorySavedCartRepository } from "@/infrastructure/memory/memory-saved-carts";
import { newOrder } from "@/test/order-contract";
import { makeGetOrder, makeSyncCart } from "./orders";

let orders: MemoryOrderRepository;
let identity: MemoryIdentity;

beforeEach(() => {
  orders = new MemoryOrderRepository();
  identity = new MemoryIdentity();
});

describe("GetOrder", () => {
  it("shows a guest order only with its tracking token", async () => {
    const input = newOrder();
    await orders.create(input);
    const getOrder = makeGetOrder(orders, identity);
    expect(await getOrder(input.code.toLowerCase(), "token-1")).toMatchObject({ code: input.code });
    expect(await getOrder(input.code, "wrong")).toBeNull();
    expect(await getOrder(input.code, null)).toBeNull();
    expect(await getOrder("MR-NONE", "token-1")).toBeNull();
  });

  it("shows customers their own orders without a token", async () => {
    const user = identity.addUser({ email: "ana@example.com" });
    identity.signInAs(user);
    const input = newOrder({ customerId: user.id });
    await orders.create(input);
    expect(await makeGetOrder(orders, identity)(input.code, null)).toMatchObject({ code: input.code });
  });
});

describe("SyncCart", () => {
  const line = (id: string, quantity: number): CartLine => ({ productId: id as ProductId, optionIds: [] as OptionId[], quantity });

  it("does nothing for visitors", async () => {
    expect(await makeSyncCart(new MemorySavedCartRepository(), identity)([line("a", 1)], "merge")).toBeNull();
  });

  it("merges the saved cart once on sign-in and replaces it afterwards", async () => {
    const user = identity.addUser({ email: "ana@example.com" });
    identity.signInAs(user);
    const carts = new MemorySavedCartRepository();
    await carts.save(user.id, [line("a", 1), line("b", 1)]);
    const sync = makeSyncCart(carts, identity);
    expect(await sync([line("a", 2)], null)).toEqual({ owner: user.id, lines: [line("a", 3), line("b", 1)] });
    expect(await sync([line("a", 3), line("b", 1)], user.id)).toEqual({ owner: user.id, lines: [line("a", 3), line("b", 1)] });
    expect(await sync([line("c", 1)], user.id)).toEqual({ owner: user.id, lines: [line("c", 1)] });
    expect(await carts.load(user.id)).toEqual([line("c", 1)]);
  });

  it("merges again when another account signs in on the same browser", async () => {
    const ana = identity.addUser({ email: "ana@example.com" });
    const leo = identity.addUser({ email: "leo@example.com" });
    const carts = new MemorySavedCartRepository();
    await carts.save(leo.id, [line("b", 1)]);
    identity.signInAs(leo);
    expect(await makeSyncCart(carts, identity)([line("a", 1)], ana.id)).toEqual({
      owner: leo.id,
      lines: [line("b", 1), line("a", 1)],
    });
  });
});
