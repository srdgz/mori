import { and, count, eq, gte, inArray, not, sql, type SQL } from "drizzle-orm";
import type {
  CouponRepository,
  NewOrder,
  OrderRepository,
  OrderView,
  SettingsRepository,
  ShopSettings,
  StoredCoupon,
} from "@/core/application/ports/checkout";
import type { UserId } from "@/core/domain/access/actor";
import type { TimeOfDay, Weekday, WeeklySchedule } from "@/core/domain/fulfilment/opening-hours";
import { isLocale } from "@/core/domain/shared/locale";
import { money } from "@/core/domain/shared/money";
import type { LocalDate } from "@/core/domain/shared/zoned-time";
import type { Database } from "./database";
import { closures, couponRedemptions, coupons, deliveryZones, openingHours, orderItems, orders, storeSettings } from "./schema";

async function rows<T>(db: Database, statement: SQL): Promise<T[]> {
  return ((await db.execute(statement)) as unknown as { rows: T[] }).rows;
}

export class DrizzleSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Database) {}

  async load(): Promise<ShopSettings> {
    const [settings] = await this.db.select().from(storeSettings).where(eq(storeSettings.id, 1));
    if (!settings) throw new Error("store_settings is empty: run the seed");
    const hours = await this.db.select().from(openingHours);
    const days = await this.db
      .select({ day: closures.day })
      .from(closures)
      .where(gte(closures.day, sql`current_date`));
    const zones = await this.db
      .select({ postalCode: deliveryZones.postalCode })
      .from(deliveryZones)
      .where(eq(deliveryZones.isActive, true));

    const schedule = Object.fromEntries(
      ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((weekday) => {
        const row = hours.find((h) => h.weekday === weekday);
        return [
          weekday,
          row?.opensAt && row.closesAt
            ? { opens: row.opensAt.slice(0, 5) as TimeOfDay, closes: row.closesAt.slice(0, 5) as TimeOfDay }
            : null,
        ];
      }),
    ) as WeeklySchedule;

    return {
      timeZone: settings.timezone,
      prepMinutes: settings.prepMinutes,
      slotMinutes: settings.slotMinutes,
      slotCapacity: settings.slotCapacity,
      daysAhead: settings.scheduleDaysAhead,
      ordersPaused: settings.ordersPaused,
      unpaidHoldMinutes: settings.unpaidHoldMinutes,
      vatRateBasisPoints: settings.vatRateBp,
      schedule,
      closures: days.map((d) => d.day as LocalDate),
      delivery: {
        enabled: settings.deliveryEnabled,
        zones: zones.map((z) => z.postalCode).sort(),
        minimum: money(settings.deliveryMinCents),
        fee: money(settings.deliveryFeeCents),
        freeFrom: money(settings.deliveryFreeFromCents),
        lastOrderMinutes: settings.deliveryLastOrderMinutes,
        etaMin: settings.deliveryEtaMin,
        etaMax: settings.deliveryEtaMax,
      },
    };
  }
}

export class DrizzleCouponRepository implements CouponRepository {
  constructor(private readonly db: Database) {}

  async byCode(code: string): Promise<StoredCoupon | null> {
    const [row] = await this.db.select().from(coupons).where(eq(coupons.code, code));
    if (!row) return null;
    return {
      id: row.id,
      code: row.code.toUpperCase(),
      kind: row.kind,
      value: row.value,
      minSubtotal: money(row.minSubtotalCents),
      firstOrderOnly: row.firstOrderOnly,
      maxUses: row.maxUses,
      perCustomerLimit: row.perCustomerLimit,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      isActive: row.isActive,
    };
  }

  async uses(couponId: string, email: string): Promise<{ total: number; customer: number }> {
    const [total] = await this.db.select({ n: count() }).from(couponRedemptions).where(eq(couponRedemptions.couponId, couponId));
    const [customer] = await this.db
      .select({ n: count() })
      .from(couponRedemptions)
      .where(and(eq(couponRedemptions.couponId, couponId), eq(couponRedemptions.customerEmail, email)));
    return { total: total?.n ?? 0, customer: customer?.n ?? 0 };
  }
}

function causeMessage(error: unknown): string {
  const cause = (error as { cause?: { message?: string; code?: string; constraint?: string } }).cause;
  return `${cause?.code ?? ""} ${cause?.constraint ?? ""} ${cause?.message ?? (error as Error).message}`;
}

export class DrizzleOrderRepository implements OrderRepository {
  constructor(private readonly db: Database) {}

  async slotLoad(from: Date, to: Date): Promise<Map<number, number>> {
    const result = await rows<{ slot_start: Date | string; n: number }>(
      this.db,
      sql`select slot_start, count(*)::int as n from orders
          where slot_start >= ${from.toISOString()} and slot_start < ${to.toISOString()}
            and slot_occupied_by(status, created_at, (select unpaid_hold_minutes from store_settings where id = 1))
          group by slot_start`,
    );
    return new Map(result.map((r) => [new Date(r.slot_start).getTime(), r.n]));
  }

  async create(order: NewOrder): Promise<{ id: string; trackingToken: string } | "slot_full" | "code_taken"> {
    const payload = {
      code: order.code,
      customer_id: order.customerId,
      contact_name: order.contact.name,
      contact_email: order.contact.email,
      contact_phone: order.contact.phone,
      locale: order.locale,
      fulfilment: order.fulfilment,
      slot_start: order.slotStart?.toISOString() ?? null,
      ...(order.deliveryAddress ? { delivery_address: order.deliveryAddress } : {}),
      notes: order.notes,
      subtotal_cents: order.subtotal.cents,
      discount_cents: order.discount.cents,
      delivery_fee_cents: order.deliveryFee.cents,
      total_cents: order.total.cents,
      vat_cents: order.vat.cents,
      coupon_id: order.couponId,
    };
    const items = order.lines.map((l) => ({
      product_id: l.productId,
      product_name: l.productName,
      options: l.options,
      unit_price_cents: l.unitPrice.cents,
      quantity: l.quantity,
      line_total_cents: l.total.cents,
    }));
    try {
      const [created] = await rows<{ id: string }>(
        this.db,
        sql`select create_order(${JSON.stringify(payload)}::jsonb, ${JSON.stringify(items)}::jsonb) as id`,
      );
      const [row] = await this.db.select({ trackingToken: orders.trackingToken }).from(orders).where(eq(orders.id, created!.id));
      return { id: created!.id, trackingToken: row!.trackingToken };
    } catch (error) {
      const message = causeMessage(error);
      if (message.includes("slot_full")) return "slot_full";
      if (message.includes("orders_code_unique")) return "code_taken";
      throw error;
    }
  }

  async attachPayment(orderId: string, paymentIntentId: string): Promise<void> {
    await this.db.update(orders).set({ paymentIntentId }).where(eq(orders.id, orderId));
  }

  async confirmPayment(paymentIntentId: string): Promise<{ orderId: string; confirmedNow: boolean } | null> {
    const [row] = await rows<{ order_id: string; confirmed_now: boolean }>(this.db, sql`select * from confirm_payment(${paymentIntentId})`);
    return row ? { orderId: row.order_id, confirmedNow: row.confirmed_now } : null;
  }

  private async view(where: SQL): Promise<OrderView | null> {
    const [order] = await this.db.select().from(orders).where(where);
    if (!order) return null;
    const lines = await this.db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(orderItems.lineTotalCents);
    return {
      id: order.id,
      code: order.code,
      status: order.status,
      customerId: order.customerId as UserId | null,
      trackingToken: order.trackingToken,
      contactName: order.contactName,
      contactEmail: order.contactEmail,
      locale: isLocale(order.locale) ? order.locale : "es",
      fulfilment: order.fulfilment,
      slotStart: order.slotStart,
      deliveryAddress: order.deliveryAddress
        ? {
            line1: order.deliveryAddress.line1,
            line2: order.deliveryAddress.line2 ?? null,
            postalCode: order.deliveryAddress.postalCode,
            city: order.deliveryAddress.city,
            instructions: order.deliveryAddress.instructions ?? null,
          }
        : null,
      subtotal: money(order.subtotalCents),
      discount: money(order.discountCents),
      deliveryFee: money(order.deliveryFeeCents),
      total: money(order.totalCents),
      vat: money(order.vatCents),
      lines: lines
        .sort((a, b) => b.lineTotalCents - a.lineTotalCents)
        .map((l) => ({
          productId: l.productId ?? "",
          productName: l.productName,
          options: l.options,
          unitPrice: money(l.unitPriceCents),
          quantity: l.quantity,
          total: money(l.lineTotalCents),
        })),
      createdAt: order.createdAt,
    };
  }

  byId(id: string): Promise<OrderView | null> {
    return this.view(eq(orders.id, id));
  }

  byCode(code: string): Promise<OrderView | null> {
    return this.view(eq(orders.code, code));
  }

  async paidOrderCount(email: string, customerId: UserId | null): Promise<number> {
    const owner = customerId
      ? sql`(${orders.contactEmail} = ${email} or ${orders.customerId} = ${customerId})`
      : eq(orders.contactEmail, email);
    const [row] = await this.db
      .select({ n: count() })
      .from(orders)
      .where(and(owner, not(inArray(orders.status, ["pending_payment", "expired"]))));
    return row?.n ?? 0;
  }
}
