import { describe, expect, it } from "vitest";
import { MemoryCatalogRepository } from "@/infrastructure/memory/memory-catalog-repository";
import {
  defaultShopSettings,
  MemoryOrderRepository,
  MemorySettingsRepository,
  SequenceRandom,
} from "@/infrastructure/memory/memory-checkout";
import { catalogSeed } from "@/infrastructure/seed/catalog";
import { newOrder } from "@/test/order-contract";
import { DEMO_ACTIVE_LIMIT, DEMO_CONTACT, makeExpireOrders, makeRunDemoOrders } from "./jobs";

const open = new Date("2030-01-07T11:00:00Z");
const night = new Date("2030-01-07T20:30:00Z");

function setup(now: Date, values: number[] = [0.1, 0, 0, 0.5, 0.1, 0.2, 0.3, 0.4], settings = defaultShopSettings) {
  const orders = new MemoryOrderRepository(50);
  const run = makeRunDemoOrders({
    orders,
    catalog: new MemoryCatalogRepository(catalogSeed),
    settings: new MemorySettingsRepository(settings),
    clock: { now: () => now },
    random: new SequenceRandom(values),
  });
  return { orders, run };
}

describe("RunDemoOrders", () => {
  it("creates a paid example pickup order while the shop is open", async () => {
    const { orders, run } = setup(open);
    const result = await run();
    expect(result.advanced).toBe(0);
    expect(result.created).toMatch(/^MR-[A-Z2-9]{4}$/);
    const order = await orders.byCode(result.created!);
    expect(order).toMatchObject({ isDemo: true, status: "received", fulfilment: "pickup", contactEmail: DEMO_CONTACT.email });
    expect(order?.slotStart).toBeInstanceOf(Date);
    expect(order?.total.cents).toBeGreaterThan(0);
    expect(order?.paymentIntentId).toBe(`demo_${result.created}`);
  });

  it("sometimes sends the example order to an address", async () => {
    const { orders, run } = setup(open, [0.1, 0, 0, 0.1, 0.5, 0.6, 0.7, 0.8]);
    const result = await run();
    const order = await orders.byCode(result.created!);
    expect(order).toMatchObject({
      fulfilment: "delivery",
      slotStart: null,
      deliveryAddress: { postalCode: defaultShopSettings.delivery.zones[0] },
    });
    expect(order?.deliveryFee.cents).toBe(defaultShopSettings.delivery.fee.cents);
  });

  it("stays quiet at night, while paused or with enough example orders going", async () => {
    expect((await setup(night).run()).created).toBeNull();
    expect((await setup(open, undefined, { ...defaultShopSettings, ordersPaused: true }).run()).created).toBeNull();

    const busy = setup(open);
    for (let i = 0; i < DEMO_ACTIVE_LIMIT; i++) {
      const input = newOrder({ isDemo: true, slotStart: new Date(Date.UTC(2030, 0, 7, 12, i * 15)) });
      const created = await busy.orders.create(input);
      if (typeof created === "string") throw new Error(created);
      await busy.orders.attachPayment(created.id, `pi_${input.code}`);
      await busy.orders.confirmPayment(`pi_${input.code}`);
    }
    expect((await busy.run()).created).toBeNull();
  });

  it("moves example orders along and leaves real ones alone", async () => {
    const { orders, run } = setup(night);
    const demo = newOrder({ isDemo: true, slotStart: new Date("2030-01-07T18:00:00Z") });
    const real = newOrder({ slotStart: new Date("2030-01-07T18:15:00Z") });
    for (const input of [demo, real]) {
      const created = await orders.create(input);
      if (typeof created === "string") throw new Error(created);
      await orders.attachPayment(created.id, `pi_${input.code}`);
      await orders.confirmPayment(`pi_${input.code}`);
      const stored = orders.orders.find((o) => o.id === created.id)!;
      Object.assign(stored, { events: [{ status: "received", at: new Date(night.getTime() - 5 * 60_000) }] });
    }
    expect((await run()).advanced).toBe(1);
    expect((await orders.byCode(demo.code))?.status).toBe("preparing");
    expect((await orders.byCode(real.code))?.status).toBe("received");
    const moved = orders.orders.find((o) => o.code === demo.code)!;
    Object.assign(moved, { events: [...moved.events.slice(0, -1), { status: "preparing", at: new Date(night.getTime() - 60_000) }] });
    expect((await run()).advanced).toBe(0);
  });

  it("gives up when no slot or drink is available", async () => {
    const full = { ...defaultShopSettings, slotCapacity: 0 };
    expect((await setup(open, undefined, full).run()).created).toBeNull();
    const orders = new MemoryOrderRepository(50);
    const empty = makeRunDemoOrders({
      orders,
      catalog: new MemoryCatalogRepository([]),
      settings: new MemorySettingsRepository(),
      clock: { now: () => open },
      random: new SequenceRandom([0.1]),
    });
    expect((await empty()).created).toBeNull();
  });
});

describe("ExpireOrders", () => {
  it("expires unpaid orders older than half an hour", async () => {
    const orders = new MemoryOrderRepository();
    const old = newOrder();
    await orders.create(old);
    await orders.create(newOrder());
    Object.assign(orders.orders[0]!, { createdAt: new Date(Date.now() - 40 * 60_000) });
    expect(await makeExpireOrders(orders)()).toBe(1);
    expect((await orders.byCode(old.code))?.status).toBe("expired");
  });
});
