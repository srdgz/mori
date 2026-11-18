import { and, count, desc, eq, gte, ilike, inArray, lt, max, or, sql, sum } from "drizzle-orm";
import type {
  AdminCoupon,
  AdminCouponRepository,
  AdminSettingsRepository,
  CustomerDirectory,
  CustomerRow,
  SalesReports,
  SalesSummary,
  StoreSettingsView,
} from "@/core/application/ports/admin-store";
import type { Weekday } from "@/core/domain/fulfilment/opening-hours";
import type { EditableSettings } from "@/core/domain/fulfilment/store-settings";
import type { Coupon } from "@/core/domain/promotions/coupon";
import { money } from "@/core/domain/shared/money";
import type { LocalDate } from "@/core/domain/shared/zoned-time";
import { DrizzleSettingsRepository } from "./drizzle-checkout-repositories";
import type { Database } from "./database";
import { closures, couponRedemptions, coupons, deliveryZones, openingHours, orderItems, orders, storeSettings, users } from "./schema";

const PAID = ["received", "preparing", "ready", "out_for_delivery", "completed"] as const;

function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } }).cause;
  return (error as { code?: string }).code === "23505" || cause?.code === "23505";
}

export class DrizzleAdminCouponRepository implements AdminCouponRepository {
  constructor(private readonly db: Database) {}

  async list(): Promise<AdminCoupon[]> {
    const rows = await this.db
      .select({ coupon: coupons, uses: count(couponRedemptions.orderId) })
      .from(coupons)
      .leftJoin(couponRedemptions, eq(couponRedemptions.couponId, coupons.id))
      .groupBy(coupons.id)
      .orderBy(desc(coupons.createdAt));
    return rows.map(({ coupon, uses }) => ({
      id: coupon.id,
      code: coupon.code,
      kind: coupon.kind,
      value: coupon.value,
      minSubtotal: money(coupon.minSubtotalCents),
      firstOrderOnly: coupon.firstOrderOnly,
      maxUses: coupon.maxUses,
      perCustomerLimit: coupon.perCustomerLimit,
      startsAt: coupon.startsAt,
      endsAt: coupon.endsAt,
      isActive: coupon.isActive,
      uses,
    }));
  }

  async create(coupon: Coupon): Promise<{ id: string } | "code_taken"> {
    try {
      const [created] = await this.db
        .insert(coupons)
        .values({
          code: coupon.code,
          kind: coupon.kind,
          value: coupon.value,
          minSubtotalCents: coupon.minSubtotal.cents,
          firstOrderOnly: coupon.firstOrderOnly,
          maxUses: coupon.maxUses,
          perCustomerLimit: coupon.perCustomerLimit,
          startsAt: coupon.startsAt,
          endsAt: coupon.endsAt,
          isActive: coupon.isActive,
        })
        .returning({ id: coupons.id });
      return { id: created!.id };
    } catch (error) {
      if (isUniqueViolation(error)) return "code_taken";
      throw error;
    }
  }

  async setActive(id: string, active: boolean): Promise<boolean> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
    const updated = await this.db.update(coupons).set({ isActive: active }).where(eq(coupons.id, id)).returning({ id: coupons.id });
    return updated.length > 0;
  }
}

export class DrizzleAdminSettingsRepository implements AdminSettingsRepository {
  constructor(private readonly db: Database) {}

  async load(): Promise<StoreSettingsView> {
    const settings = await new DrizzleSettingsRepository(this.db).load();
    return {
      ordersPaused: settings.ordersPaused,
      prepMinutes: settings.prepMinutes,
      slotCapacity: settings.slotCapacity,
      daysAhead: settings.daysAhead,
      schedule: settings.schedule,
      delivery: {
        enabled: settings.delivery.enabled,
        minimumCents: settings.delivery.minimum.cents,
        feeCents: settings.delivery.fee.cents,
        freeFromCents: settings.delivery.freeFrom.cents,
        lastOrderMinutes: settings.delivery.lastOrderMinutes,
        etaMin: settings.delivery.etaMin,
        etaMax: settings.delivery.etaMax,
      },
      closures: settings.closures,
      zones: settings.delivery.zones,
    };
  }

  async save(settings: EditableSettings): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(storeSettings)
        .set({
          ordersPaused: settings.ordersPaused,
          prepMinutes: settings.prepMinutes,
          slotCapacity: settings.slotCapacity,
          scheduleDaysAhead: settings.daysAhead,
          deliveryEnabled: settings.delivery.enabled,
          deliveryMinCents: settings.delivery.minimumCents,
          deliveryFeeCents: settings.delivery.feeCents,
          deliveryFreeFromCents: settings.delivery.freeFromCents,
          deliveryLastOrderMinutes: settings.delivery.lastOrderMinutes,
          deliveryEtaMin: settings.delivery.etaMin,
          deliveryEtaMax: settings.delivery.etaMax,
        })
        .where(eq(storeSettings.id, 1));
      for (const weekday of [0, 1, 2, 3, 4, 5, 6] as Weekday[]) {
        const day = settings.schedule[weekday];
        const values = { weekday, opensAt: day?.opens ?? null, closesAt: day?.closes ?? null };
        await tx.insert(openingHours).values(values).onConflictDoUpdate({ target: openingHours.weekday, set: values });
      }
    });
  }

  async addClosure(day: LocalDate): Promise<void> {
    await this.db.insert(closures).values({ day }).onConflictDoNothing();
  }

  async removeClosure(day: LocalDate): Promise<void> {
    await this.db.delete(closures).where(eq(closures.day, day));
  }

  async addZone(postalCode: string): Promise<void> {
    await this.db
      .insert(deliveryZones)
      .values({ postalCode, isActive: true })
      .onConflictDoUpdate({ target: deliveryZones.postalCode, set: { isActive: true } });
  }

  async removeZone(postalCode: string): Promise<void> {
    await this.db.delete(deliveryZones).where(eq(deliveryZones.postalCode, postalCode));
  }
}

export class DrizzleCustomerDirectory implements CustomerDirectory {
  constructor(private readonly db: Database) {}

  async list(search: string, limit: number, offset: number): Promise<CustomerRow[]> {
    const needle = search ? `%${search.replace(/[%_\\]/g, "\\$&")}%` : null;
    const paid = and(eq(orders.customerId, users.id), inArray(orders.status, [...PAID]));
    const rows = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        orders: count(orders.id),
        spent: sum(orders.totalCents).mapWith(Number),
        lastOrderAt: max(orders.createdAt),
      })
      .from(users)
      .leftJoin(orders, paid)
      .where(
        and(
          eq(users.role, "customer"),
          sql`${users.deletedAt} is null`,
          needle ? or(ilike(users.name, needle), ilike(users.email, needle)) : undefined,
        ),
      )
      .groupBy(users.id)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map(({ spent, lastOrderAt, ...row }) => ({
      ...row,
      spentCents: spent ?? 0,
      lastOrderAt: lastOrderAt ? new Date(lastOrderAt) : null,
    }));
  }
}

export class DrizzleSalesReports implements SalesReports {
  constructor(private readonly db: Database) {}

  private paidBetween(from: Date, to: Date) {
    return and(inArray(orders.status, [...PAID]), gte(orders.createdAt, from), lt(orders.createdAt, to));
  }

  async summary(from: Date, to: Date): Promise<SalesSummary> {
    const [row] = await this.db
      .select({
        total: sum(orders.totalCents).mapWith(Number),
        orders: count(orders.id),
        pickup: sql<number>`count(*) filter (where ${orders.fulfilment} = 'pickup')`.mapWith(Number),
        delivery: sql<number>`count(*) filter (where ${orders.fulfilment} = 'delivery')`.mapWith(Number),
      })
      .from(orders)
      .where(this.paidBetween(from, to));
    return { totalCents: row?.total ?? 0, orders: row?.orders ?? 0, pickup: row?.pickup ?? 0, delivery: row?.delivery ?? 0 };
  }

  async byHour(from: Date, to: Date, timeZone: string) {
    const hour = sql<number>`extract(hour from ${orders.createdAt} at time zone ${timeZone})::int`;
    const rows = await this.db
      .select({ hour, total: sum(orders.totalCents).mapWith(Number) })
      .from(orders)
      .where(this.paidBetween(from, to))
      .groupBy(sql`1`)
      .orderBy(sql`1`);
    return rows.map((r) => ({ hour: Number(r.hour), totalCents: r.total ?? 0 }));
  }

  async topProducts(from: Date, to: Date, limit: number) {
    const quantity = sum(orderItems.quantity).mapWith(Number);
    const rows = await this.db
      .select({ name: orderItems.productName, quantity })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(this.paidBetween(from, to))
      .groupBy(orderItems.productName)
      .orderBy(desc(quantity), orderItems.productName)
      .limit(limit);
    return rows.map((r) => ({ name: r.name, quantity: r.quantity ?? 0 }));
  }
}
