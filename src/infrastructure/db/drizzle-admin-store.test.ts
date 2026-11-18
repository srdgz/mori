import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { UserId } from "@/core/domain/access/actor";
import { money } from "@/core/domain/shared/money";
import { newOrder } from "@/test/order-contract";
import {
  DrizzleAdminCouponRepository,
  DrizzleAdminSettingsRepository,
  DrizzleCustomerDirectory,
  DrizzleSalesReports,
} from "./drizzle-admin-store";
import { DrizzleOrderRepository } from "./drizzle-checkout-repositories";
import { users } from "./schema";
import { createTestDatabase, type TestDatabase } from "./testing";

let test: TestDatabase;

beforeAll(async () => {
  test = await createTestDatabase();
});

afterAll(async () => {
  await test.client.close();
});

describe("DrizzleAdminCouponRepository", () => {
  it("creates, lists with uses and switches coupons", async () => {
    const coupons = new DrizzleAdminCouponRepository(test.db);
    const coupon = {
      code: "OTONO15",
      kind: "percent" as const,
      value: 15,
      minSubtotal: money(800),
      firstOrderOnly: false,
      maxUses: 50,
      perCustomerLimit: 1,
      startsAt: null,
      endsAt: new Date("2031-01-01T00:00:00Z"),
      isActive: true,
    };
    const created = await coupons.create(coupon);
    if (created === "code_taken") throw new Error("code_taken");
    expect(await coupons.create(coupon)).toBe("code_taken");

    const listed = (await coupons.list()).find((c) => c.id === created.id);
    expect(listed).toMatchObject({ code: "OTONO15", value: 15, minSubtotal: money(800), maxUses: 50, uses: 0, isActive: true });
    expect((await coupons.list()).some((c) => c.code === "BIENVENIDA10")).toBe(true);

    expect(await coupons.setActive(created.id, false)).toBe(true);
    expect((await coupons.list()).find((c) => c.id === created.id)?.isActive).toBe(false);
    expect(await coupons.setActive("not-an-id", false)).toBe(false);
    expect(await coupons.setActive("00000000-0000-4000-8000-00000000dead", false)).toBe(false);
  });
});

describe("DrizzleAdminSettingsRepository", () => {
  it("loads, saves hours and delivery, and edits closures and zones", async () => {
    const settings = new DrizzleAdminSettingsRepository(test.db);
    const current = await settings.load();
    expect(current.slotCapacity).toBe(8);
    expect(current.zones).toContain("28004");

    await settings.save({
      ...current,
      ordersPaused: true,
      slotCapacity: 6,
      schedule: { ...current.schedule, 0: { opens: "10:00", closes: "14:00" } },
      delivery: { ...current.delivery, feeCents: 300 },
    });
    await settings.addClosure("2031-12-25");
    await settings.addClosure("2031-12-25");
    await settings.addZone("28010");

    const saved = await settings.load();
    expect(saved).toMatchObject({ ordersPaused: true, slotCapacity: 6, delivery: { feeCents: 300 } });
    expect(saved.schedule[0]).toEqual({ opens: "10:00", closes: "14:00" });
    expect(saved.closures).toContain("2031-12-25");
    expect(saved.zones).toContain("28010");

    await settings.removeClosure("2031-12-25");
    await settings.removeZone("28010");
    await settings.save({ ...current });
    const restored = await settings.load();
    expect(restored.closures).not.toContain("2031-12-25");
    expect(restored.zones).not.toContain("28010");
    expect(restored.schedule[0]).toEqual(current.schedule[0]);
  });
});

describe("customers and reports", () => {
  it("counts paid orders per customer and reports sales", async () => {
    const [user] = await test.db.insert(users).values({ name: "Lía Report", email: "lia-report@example.com" }).returning({ id: users.id });
    const orders = new DrizzleOrderRepository(test.db);
    const from = new Date(Date.now() - 60 * 60 * 1000);
    const to = new Date(Date.now() + 60 * 60 * 1000);
    const before = await new DrizzleSalesReports(test.db).summary(from, to);

    const paid = newOrder({ customerId: user!.id as UserId, slotStart: new Date("2031-04-04T10:00:00Z") });
    const delivery = newOrder({
      customerId: user!.id as UserId,
      fulfilment: "delivery",
      slotStart: null,
      deliveryAddress: { line1: "C/ del Pez 1", line2: null, postalCode: "28004", city: "Madrid", instructions: null },
    });
    const unpaid = newOrder({ customerId: user!.id as UserId, slotStart: new Date("2031-04-04T10:15:00Z") });
    for (const input of [paid, delivery, unpaid]) await orders.create(input);
    for (const input of [paid, delivery]) {
      const view = await orders.byCode(input.code);
      await orders.attachPayment(view!.id, `pi_${input.code}`);
      await orders.confirmPayment(`pi_${input.code}`);
    }

    const directory = new DrizzleCustomerDirectory(test.db);
    const [found] = await directory.list("lia-report", 10, 0);
    expect(found).toMatchObject({ name: "Lía Report", orders: 2, spentCents: 3360 });
    expect(found?.lastOrderAt).toBeInstanceOf(Date);
    expect(await directory.list("nobody-matches-this", 10, 0)).toEqual([]);
    expect((await directory.list("", 1, 0)).length).toBe(1);

    const reports = new DrizzleSalesReports(test.db);
    const summary = await reports.summary(from, to);
    expect(summary.totalCents - before.totalCents).toBe(3360);
    expect(summary.pickup - before.pickup).toBe(1);
    expect(summary.delivery - before.delivery).toBe(1);
    const hours = await reports.byHour(from, to, "Europe/Madrid");
    expect(hours.reduce((total, h) => total + h.totalCents, 0)).toBe(summary.totalCents);
    expect((await reports.topProducts(from, to, 5))[0]).toMatchObject({ name: "Classic Matcha" });
  });
});
