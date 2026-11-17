import { beforeEach, describe, expect, it } from "vitest";
import { MemoryCatalogRepository } from "@/infrastructure/memory/memory-catalog-repository";
import { MemoryOrderRepository } from "@/infrastructure/memory/memory-checkout";
import { MemoryIdentity } from "@/infrastructure/memory/memory-identity";
import { MemoryMailer } from "@/infrastructure/memory/memory-mailer";
import { group, option, product } from "@/test/catalog";
import { newOrder } from "@/test/order-contract";
import {
  HISTORY_PAGE,
  makeAdvanceOrderStatus,
  makeClaimOrder,
  makeListOrders,
  makeReorder,
  makeSealOrderQuery,
  makeTrackOrder,
  trackingSnapshot,
  trackingVersion,
} from "./tracking";

let orders: MemoryOrderRepository;
let identity: MemoryIdentity;

beforeEach(() => {
  orders = new MemoryOrderRepository();
  identity = new MemoryIdentity();
});

async function placed(overrides: Parameters<typeof newOrder>[0] = {}) {
  const input = newOrder(overrides);
  const created = await orders.create(input);
  if (typeof created === "string") throw new Error(created);
  await orders.attachPayment(created.id, `pi_${input.code}`);
  await orders.confirmPayment(`pi_${input.code}`);
  return { ...created, code: input.code };
}

function signInStaff() {
  identity.signInAs(identity.addUser({ email: "barista@example.com" }, "staff"));
}

describe("TrackOrder", () => {
  it("gives the timeline and a version that changes with each step", async () => {
    const order = await placed();
    const track = makeTrackOrder(orders, identity);
    const first = await track(order.code.toLowerCase(), order.trackingToken);
    expect(first?.timeline.steps.map((s) => s.state)).toEqual(["current", "upcoming", "upcoming", "upcoming"]);
    expect(first?.version).toBe("received.2");
    expect(first?.canClaim).toBe(false);
    expect(trackingSnapshot(first!)).toMatchObject({
      code: order.code,
      status: "received",
      live: true,
      ended: null,
      steps: [{ status: "received", state: "current" }, { at: null }, { at: null }, { at: null }],
    });
    expect(typeof trackingSnapshot(first!).steps[0]?.at).toBe("string");

    await orders.advance(order.id, "preparing");
    expect((await track(order.code, order.trackingToken))?.version).toBe("preparing.3");
    expect(trackingVersion({ status: "ready", events: [] })).toBe("ready.0");
  });

  it("hides orders from people without access", async () => {
    const order = await placed();
    const track = makeTrackOrder(orders, identity);
    expect(await track(order.code, "wrong")).toBeNull();
    expect(await track(order.code, null)).toBeNull();
    expect(await track("MR-NONE", order.trackingToken)).toBeNull();
  });

  it("offers a signed-in customer to keep a guest order they hold the link to", async () => {
    const order = await placed();
    identity.signInAs(identity.addUser({ email: "leo@example.com" }));
    expect((await makeTrackOrder(orders, identity)(order.code, order.trackingToken))?.canClaim).toBe(true);
  });
});

describe("ClaimOrder", () => {
  it("links a guest order to the signed-in customer once", async () => {
    const order = await placed();
    const user = identity.addUser({ email: "leo@example.com" });
    identity.signInAs(user);
    const claim = makeClaimOrder(orders, identity);
    expect(await claim(order.code, order.trackingToken)).toBe("claimed");
    expect((await orders.byCode(order.code))?.customerId).toBe(user.id);
    expect(await claim(order.code, order.trackingToken)).toBe("not_allowed");
  });

  it("needs a customer session, the right token and an unowned order", async () => {
    const order = await placed();
    const claim = makeClaimOrder(orders, identity);
    expect(await claim(order.code, order.trackingToken)).toBe("not_allowed");
    identity.signInAs(identity.addUser({ email: "leo@example.com" }));
    expect(await claim(order.code, "wrong")).toBe("not_allowed");
    expect(await claim("MR-NONE", order.trackingToken)).toBe("not_allowed");
    signInStaff();
    expect(await claim(order.code, order.trackingToken)).toBe("not_allowed");
  });

  it("reports a race lost to another customer", async () => {
    const order = await placed();
    identity.signInAs(identity.addUser({ email: "leo@example.com" }));
    orders.assignCustomer = async () => false;
    expect(await makeClaimOrder(orders, identity)(order.code, order.trackingToken)).toBe("not_allowed");
  });
});

describe("ListOrders", () => {
  it("lists the customer's paid orders newest first, page by page", async () => {
    orders = new MemoryOrderRepository(100);
    const user = identity.addUser({ email: "ana@example.com" });
    identity.signInAs(user);
    for (let i = 0; i < HISTORY_PAGE + 2; i++) {
      const order = await placed({ customerId: user.id });
      const stored = orders.orders.find((o) => o.code === order.code)!;
      Object.assign(stored, { createdAt: new Date(Date.UTC(2026, 10, 1 + i)) });
    }
    await orders.create(newOrder({ customerId: user.id }));
    await placed();

    const list = makeListOrders(orders, identity);
    const first = await list(null);
    expect(first?.orders).toHaveLength(HISTORY_PAGE);
    expect(first?.orders[0]?.createdAt).toEqual(new Date(Date.UTC(2026, 10, 12)));
    expect(first?.orders[0]).toMatchObject({ items: 3, status: "received", fulfilment: "pickup" });
    expect(first?.next).toEqual(new Date(Date.UTC(2026, 10, 3)));

    const second = await list(first!.next);
    expect(second?.orders.map((o) => o.createdAt)).toEqual([new Date(Date.UTC(2026, 10, 2)), new Date(Date.UTC(2026, 10, 1))]);
    expect(second?.next).toBeNull();
  });

  it("is empty for visitors", async () => {
    expect(await makeListOrders(orders, identity)(null)).toBeNull();
  });
});

describe("Reorder", () => {
  const regular = option("regular");
  const classic = product({ slug: "classic", optionGroups: [group("size", [regular])] });

  it("rebuilds the cart from an order the viewer can see", async () => {
    const order = await placed({
      lines: [
        {
          productId: "classic",
          productName: "Classic",
          options: [{ group: "size", code: "regular", name: { es: "Normal", en: "Regular" }, priceDeltaCents: 0 }],
          unitPrice: classic.price,
          quantity: 2,
          total: classic.price,
        },
        { productId: "gone", productName: "Gone", options: [], unitPrice: classic.price, quantity: 1, total: classic.price },
      ],
    });
    const reorder = makeReorder({ orders, catalog: new MemoryCatalogRepository([classic]), identity });
    expect(await reorder(order.code, order.trackingToken)).toEqual({
      lines: [{ productId: "classic", optionIds: ["opt-regular"], quantity: 2 }],
      skipped: ["Gone"],
    });
    expect(await reorder(order.code, null)).toBeNull();
    expect(await reorder("MR-NONE", null)).toBeNull();
  });
});

describe("AdvanceOrderStatus", () => {
  function advanceWith(mailer: MemoryMailer) {
    return makeAdvanceOrderStatus({
      orders,
      identity,
      mailer,
      trackingUrl: (code, token) => `https://mori.test/pedido/${code}?t=${token}`,
    });
  }

  it("lets staff move an order and emails the customer when it is ready", async () => {
    const order = await placed();
    signInStaff();
    const mailer = new MemoryMailer();
    const advance = advanceWith(mailer);
    expect(await advance(order.code, "preparing")).toBe("advanced");
    expect(mailer.sent).toHaveLength(0);
    expect(await advance(order.code, "ready")).toBe("advanced");
    expect(mailer.sent).toEqual([
      {
        kind: "order_ready",
        to: "ana@example.com",
        name: "Ana",
        locale: "es",
        code: order.code,
        url: `https://mori.test/pedido/${order.code}?t=${order.trackingToken}`,
      },
    ]);
  });

  it("emails when a delivery leaves the shop", async () => {
    const order = await placed({
      fulfilment: "delivery",
      slotStart: null,
      deliveryAddress: { line1: "C/ del Pez 12", line2: null, postalCode: "28004", city: "Madrid", instructions: null },
    });
    signInStaff();
    const mailer = new MemoryMailer();
    await advanceWith(mailer)(order.code, "preparing");
    await advanceWith(mailer)(order.code, "out_for_delivery");
    expect(mailer.sent.map((m) => m.kind)).toEqual(["order_out_for_delivery"]);
  });

  it("refuses customers, unknown orders and skipped steps", async () => {
    const order = await placed();
    const mailer = new MemoryMailer();
    expect(await advanceWith(mailer)(order.code, "preparing")).toBe("forbidden");
    identity.signInAs(identity.addUser({ email: "ana@example.com" }));
    expect(await advanceWith(mailer)(order.code, "preparing")).toBe("forbidden");
    signInStaff();
    expect(await advanceWith(mailer)("MR-NONE", "preparing")).toBe("not_found");
    expect(await advanceWith(mailer)(order.code, "ready")).toBe("invalid_transition");
    expect(mailer.sent).toHaveLength(0);
  });
});

describe("SealOrderQuery", () => {
  const sealer = {
    url: "wss://realtime.test",
    sealOrder: async (orderId: string) => ({ capability: `cap-${orderId}`, expiresAt: 1, queryFingerprint: orderId }),
  };

  it("seals the live query only for people who can see the order", async () => {
    const order = await placed();
    const seal = makeSealOrderQuery(orders, identity, sealer);
    expect(await seal(order.code, order.trackingToken)).toEqual({
      url: "wss://realtime.test",
      sealed: { capability: `cap-${order.id}`, expiresAt: 1, queryFingerprint: order.id },
    });
    expect(await seal(order.code, "wrong")).toBeNull();
    expect(await seal("MR-NONE", order.trackingToken)).toBeNull();
  });

  it("does nothing when Realtime is not configured", async () => {
    const order = await placed();
    expect(await makeSealOrderQuery(orders, identity, null)(order.code, order.trackingToken)).toBeNull();
  });
});
