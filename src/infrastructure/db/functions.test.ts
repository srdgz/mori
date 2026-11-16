import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql, type SQL } from "drizzle-orm";
import { canStaffMove, FULFILMENT_KINDS, ORDER_STATUSES, type FulfilmentKind } from "@/core/domain/ordering/order-status";
import { coupons, couponRedemptions, loyaltyLedger, orderEvents, orderItems, orders, storeSettings, users } from "./schema";
import { createTestDatabase, type TestDatabase } from "./testing";

let test: TestDatabase;
let counter = 0;

const slot = "2026-11-20T10:00:00Z";
const customerId = "50000000-0000-4000-8000-000000000001";

const items = [
  {
    product_id: "10000000-0000-4000-8000-000000000001",
    product_name: "Classic Matcha",
    options: [],
    unit_price_cents: 450,
    quantity: 2,
    line_total_cents: 900,
  },
  {
    product_id: "10000000-0000-4000-8000-000000000003",
    product_name: "Vanilla Matcha",
    options: [],
    unit_price_cents: 520,
    quantity: 1,
    line_total_cents: 520,
  },
];

function orderInput(overrides: Record<string, unknown> = {}) {
  counter += 1;
  return {
    code: `MR-T${counter.toString().padStart(3, "0")}`,
    contact_name: "Ana",
    contact_email: "ana@example.com",
    contact_phone: "600000000",
    locale: "es",
    fulfilment: "pickup",
    slot_start: slot,
    subtotal_cents: 1420,
    total_cents: 1420,
    vat_cents: 129,
    ...overrides,
  };
}

async function query<T>(statement: SQL): Promise<T[]> {
  const result = (await test.db.execute(statement)) as unknown as { rows: T[] };
  return result.rows;
}

async function createOrder(overrides: Record<string, unknown> = {}): Promise<string> {
  const [row] = await query<{ id: string }>(
    sql`select create_order(${JSON.stringify(orderInput(overrides))}::jsonb, ${JSON.stringify(items)}::jsonb) as id`,
  );
  return row!.id;
}

async function errorOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const cause = (error as { cause?: { message?: string } }).cause;
    return cause?.message ?? (error as Error).message;
  }
  return "no error";
}

beforeAll(async () => {
  test = await createTestDatabase();
  await test.db.insert(users).values({ id: customerId, name: "Ana", email: "ana@example.com" });
});

afterAll(async () => {
  await test.client.close();
});

beforeEach(async () => {
  await test.db.delete(loyaltyLedger);
  await test.db.delete(couponRedemptions);
  await test.db.delete(orders);
  await test.db.update(storeSettings).set({ slotCapacity: 8 });
});

describe("create_order", () => {
  it("stores the order, its lines and the first event", async () => {
    const id = await createOrder();

    const [order] = await test.db.select().from(orders).where(eq(orders.id, id));
    expect(order).toMatchObject({ status: "pending_payment", totalCents: 1420, fulfilment: "pickup" });
    expect(await test.db.$count(orderItems, eq(orderItems.orderId, id))).toBe(2);
    expect(await test.db.select({ status: orderEvents.status }).from(orderEvents).where(eq(orderEvents.orderId, id))).toEqual([
      { status: "pending_payment" },
    ]);
  });

  it("rejects an order once the slot is full", async () => {
    await test.db.update(storeSettings).set({ slotCapacity: 2 });
    await createOrder();
    await createOrder();

    expect(await errorOf(createOrder())).toContain("slot_full");
    expect(await test.db.$count(orders)).toBe(2);
  });

  it("frees the place of an order left unpaid for more than 30 minutes", async () => {
    await test.db.update(storeSettings).set({ slotCapacity: 1 });
    const stale = await createOrder();
    await test.db.execute(sql`update orders set created_at = now() - interval '31 minutes' where id = ${stale}`);

    await expect(createOrder()).resolves.toEqual(expect.any(String));
  });

  it("does not count cancelled orders", async () => {
    await test.db.update(storeSettings).set({ slotCapacity: 1 });
    const cancelled = await createOrder();
    await test.db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, cancelled));

    await expect(createOrder()).resolves.toEqual(expect.any(String));
  });

  it("does not limit deliveries by slot", async () => {
    await test.db.update(storeSettings).set({ slotCapacity: 1 });
    const delivery = {
      fulfilment: "delivery",
      slot_start: null,
      delivery_address: { line1: "Pez 1", postalCode: "28004", city: "Madrid" },
    };
    await createOrder(delivery);

    await expect(createOrder(delivery)).resolves.toEqual(expect.any(String));
  });
});

describe("confirm_payment", () => {
  async function paidOrder(overrides: Record<string, unknown> = {}) {
    const id = await createOrder({ customer_id: customerId, ...overrides });
    await test.db
      .update(orders)
      .set({ paymentIntentId: `pi_${id}` })
      .where(eq(orders.id, id));
    return id;
  }

  it("marks the order as received and adds a stamp per drink", async () => {
    const id = await paidOrder();

    await test.db.execute(sql`select confirm_payment(${`pi_${id}`})`);

    const [order] = await test.db.select().from(orders).where(eq(orders.id, id));
    expect(order?.status).toBe("received");
    expect(order?.paidAt).toBeInstanceOf(Date);
    expect(await test.db.select({ delta: loyaltyLedger.delta, reason: loyaltyLedger.reason }).from(loyaltyLedger)).toEqual([
      { delta: 3, reason: "purchase" },
    ]);
  });

  it("is idempotent when the webhook arrives twice", async () => {
    const id = await paidOrder({ stamps_redeemed: 8 });

    await test.db.execute(sql`select confirm_payment(${`pi_${id}`})`);
    await test.db.execute(sql`select confirm_payment(${`pi_${id}`})`);

    expect(await test.db.$count(loyaltyLedger)).toBe(2);
    expect(await test.db.$count(orderEvents, eq(orderEvents.orderId, id))).toBe(2);
    const [balance] = await query<{ stamps: number }>(sql`select stamps from loyalty_balance where user_id = ${customerId}`);
    expect(balance?.stamps).toBe(3 - 8);
  });

  it("records the coupon redemption", async () => {
    const [coupon] = await test.db.select().from(coupons).where(eq(coupons.code, "matchamigo"));
    const id = await paidOrder({ coupon_id: coupon!.id });

    await test.db.execute(sql`select confirm_payment(${`pi_${id}`})`);

    expect(await test.db.select().from(couponRedemptions)).toEqual([
      { couponId: coupon!.id, orderId: id, customerEmail: "ana@example.com" },
    ]);
  });

  it("gives no stamps to a guest", async () => {
    const id = await paidOrder({ customer_id: null });

    await test.db.execute(sql`select confirm_payment(${`pi_${id}`})`);

    expect(await test.db.$count(loyaltyLedger)).toBe(0);
  });

  it("ignores an unknown payment", async () => {
    const [result] = await query<{ id: string | null }>(sql`select confirm_payment('pi_unknown') as id`);
    expect(result?.id).toBeNull();
  });
});

describe("advance_order_status", () => {
  it("allows exactly the moves the domain allows staff to make", async () => {
    const delivery = { line1: "Pez 1", postalCode: "28004", city: "Madrid" };
    const byFulfilment: Record<FulfilmentKind, string> = {
      pickup: await createOrder(),
      delivery: await createOrder({ fulfilment: "delivery", slot_start: null, delivery_address: delivery }),
    };

    for (const fulfilment of FULFILMENT_KINDS) {
      const id = byFulfilment[fulfilment];
      for (const from of ORDER_STATUSES) {
        for (const to of ORDER_STATUSES) {
          await test.db.update(orders).set({ status: from }).where(eq(orders.id, id));
          const error = await errorOf(test.db.execute(sql`select advance_order_status(${id}, ${to}::order_status, null)`));
          const moved = error === "no error";
          expect({ fulfilment, from, to, moved }).toEqual({ fulfilment, from, to, moved: canStaffMove(from, to, fulfilment) });
        }
      }
    }
  });

  it("records who made the change", async () => {
    const id = await createOrder();
    await test.db.update(orders).set({ status: "received" }).where(eq(orders.id, id));

    await test.db.execute(sql`select advance_order_status(${id}, 'preparing', ${customerId})`);

    const events = await test.db
      .select({ status: orderEvents.status, actorId: orderEvents.actorId })
      .from(orderEvents)
      .where(eq(orderEvents.orderId, id));
    expect(events.at(-1)).toEqual({ status: "preparing", actorId: customerId });
  });

  it("updates updated_at so polling clients see the change", async () => {
    const id = await createOrder();
    await test.db.execute(sql`alter table orders disable trigger orders_touch_updated_at`);
    await test.db.execute(sql`update orders set status = 'received', updated_at = now() - interval '1 hour' where id = ${id}`);
    await test.db.execute(sql`alter table orders enable trigger orders_touch_updated_at`);
    const [before] = await test.db.select({ updatedAt: orders.updatedAt }).from(orders).where(eq(orders.id, id));

    await test.db.execute(sql`select advance_order_status(${id}, 'preparing', null)`);

    const [after] = await test.db.select({ updatedAt: orders.updatedAt }).from(orders).where(eq(orders.id, id));
    expect(after!.updatedAt.getTime()).toBeGreaterThan(before!.updatedAt.getTime());
  });
});

describe("expire_unpaid_orders", () => {
  it("expires only unpaid orders older than 30 minutes", async () => {
    const stale = await createOrder();
    const fresh = await createOrder();
    const paid = await createOrder();
    await test.db.execute(sql`update orders set created_at = now() - interval '31 minutes' where id in (${stale}, ${paid})`);
    await test.db.update(orders).set({ status: "received" }).where(eq(orders.id, paid));

    const [result] = await query<{ count: number }>(sql`select expire_unpaid_orders() as count`);

    expect(result?.count).toBe(1);
    const statuses = await test.db.select({ id: orders.id, status: orders.status }).from(orders);
    expect(Object.fromEntries(statuses.map((o) => [o.id, o.status]))).toEqual({
      [stale]: "expired",
      [fresh]: "pending_payment",
      [paid]: "received",
    });
  });
});

describe("anonymize_customer", () => {
  it("removes personal data from the customer's orders and keeps the amounts", async () => {
    const id = await createOrder({ customer_id: customerId, notes: "Sin hielo" });
    const other = await createOrder();

    await test.db.execute(sql`select anonymize_customer(${customerId})`);

    const [order] = await test.db.select().from(orders).where(eq(orders.id, id));
    expect(order).toMatchObject({ contactName: "Deleted customer", contactPhone: "", notes: null, totalCents: 1420 });
    expect(order?.contactEmail).toBe(`deleted+${id}@invalid`);
    const [untouched] = await test.db.select().from(orders).where(eq(orders.id, other));
    expect(untouched?.contactName).toBe("Ana");
    const [user] = await test.db.select().from(users).where(eq(users.id, customerId));
    expect(user?.deletedAt).toBeInstanceOf(Date);
    expect(user?.email).toBe(`deleted+${customerId}@invalid`);
  });
});
