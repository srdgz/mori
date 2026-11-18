import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { UserId } from "@/core/domain/access/actor";
import { money } from "@/core/domain/shared/money";
import { newOrder, orderRepositoryContract } from "@/test/order-contract";
import {
  DrizzleCouponRepository,
  DrizzleLoyaltyRepository,
  DrizzleOrderRepository,
  DrizzleSettingsRepository,
} from "./drizzle-checkout-repositories";
import { closures, orders, storeSettings, users } from "./schema";
import { createTestDatabase, type TestDatabase } from "./testing";

let test: TestDatabase;
let customerId: UserId;

beforeAll(async () => {
  test = await createTestDatabase();
  const [user] = await test.db.insert(users).values({ name: "Eva", email: "eva-contract@example.com" }).returning({ id: users.id });
  customerId = user!.id as UserId;
});

afterAll(async () => {
  await test.client.close();
});

orderRepositoryContract("DrizzleOrderRepository", async () => ({
  orders: new DrizzleOrderRepository(test.db),
  loyalty: new DrizzleLoyaltyRepository(test.db),
  customerId,
  setCapacity: async (capacity) => {
    await test.db.update(storeSettings).set({ slotCapacity: capacity }).where(eq(storeSettings.id, 1));
  },
}));

describe("DrizzleSettingsRepository", () => {
  it("loads the shop settings, schedule, closures and zones", async () => {
    await test.db.insert(closures).values({ day: "2099-12-25" });
    const settings = await new DrizzleSettingsRepository(test.db).load();
    expect(settings).toMatchObject({
      timeZone: "Europe/Madrid",
      slotMinutes: 15,
      slotCapacity: 8,
      vatRateBasisPoints: 1000,
      ordersPaused: false,
    });
    expect(settings.schedule[1]).toEqual({ opens: "08:00", closes: "20:00" });
    expect(settings.schedule[0]).toEqual({ opens: "09:30", closes: "20:30" });
    expect(settings.closures).toEqual(["2099-12-25"]);
    expect(settings.delivery).toMatchObject({
      zones: ["28004", "28005", "28010", "28012", "28013", "28015"],
      minimum: money(1200),
      fee: money(250),
    });
  });
});

describe("DrizzleCouponRepository", () => {
  it("finds a coupon whatever the case and counts its uses", async () => {
    const repository = new DrizzleCouponRepository(test.db);
    const coupon = await repository.byCode("bienvenida10");
    expect(coupon).toMatchObject({
      code: "BIENVENIDA10",
      kind: "percent",
      value: 10,
      firstOrderOnly: true,
      perCustomerLimit: 1,
      minSubtotal: money(0),
    });
    expect(await repository.byCode("NOPE")).toBeNull();
    expect(await repository.uses(coupon!.id, "ana@example.com")).toEqual({ total: 0, customer: 0 });
  });
});

describe("DrizzleOrderRepository.expireUnpaid", () => {
  it("expires unpaid orders older than the hold time and leaves recent ones", async () => {
    const repository = new DrizzleOrderRepository(test.db);
    const old = newOrder({ slotStart: new Date("2031-05-05T10:00:00Z") });
    const recent = newOrder({ slotStart: new Date("2031-05-05T10:15:00Z") });
    await repository.create(old);
    await repository.create(recent);
    await test.db
      .update(orders)
      .set({ createdAt: new Date(Date.now() - 45 * 60_000) })
      .where(eq(orders.code, old.code));
    expect(await repository.expireUnpaid()).toBeGreaterThanOrEqual(1);
    expect((await repository.byCode(old.code))?.status).toBe("expired");
    expect((await repository.byCode(recent.code))?.status).toBe("pending_payment");
  });
});
