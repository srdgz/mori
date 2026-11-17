import type {
  CouponRepository,
  NewOrder,
  OrderRepository,
  OrderView,
  PaymentEvent,
  PaymentGateway,
  PaymentIntent,
  Random,
  SettingsRepository,
  ShopSettings,
  StoredCoupon,
} from "@/core/application/ports/checkout";
import type { UserId } from "@/core/domain/access/actor";
import { money } from "@/core/domain/shared/money";
import { deliveryPostalCodes } from "../seed/shop";
import { storeSeed } from "./memory-store-repository";

export const defaultShopSettings: ShopSettings = {
  timeZone: "Europe/Madrid",
  prepMinutes: 15,
  slotMinutes: 15,
  slotCapacity: 8,
  daysAhead: 1,
  ordersPaused: false,
  unpaidHoldMinutes: 30,
  vatRateBasisPoints: 1000,
  schedule: storeSeed.schedule,
  closures: [],
  delivery: {
    enabled: true,
    zones: deliveryPostalCodes,
    minimum: money(1200),
    fee: money(250),
    freeFrom: money(2500),
    lastOrderMinutes: 30,
    etaMin: 30,
    etaMax: 45,
  },
};

export class MemorySettingsRepository implements SettingsRepository {
  constructor(public settings: ShopSettings = defaultShopSettings) {}

  async load(): Promise<ShopSettings> {
    return this.settings;
  }
}

export class MemoryCouponRepository implements CouponRepository {
  readonly redemptions: { couponId: string; email: string }[] = [];

  constructor(private readonly coupons: StoredCoupon[]) {}

  async byCode(code: string): Promise<StoredCoupon | null> {
    return this.coupons.find((c) => c.code === code.toUpperCase()) ?? null;
  }

  async uses(couponId: string, email: string): Promise<{ total: number; customer: number }> {
    const all = this.redemptions.filter((r) => r.couponId === couponId);
    return { total: all.length, customer: all.filter((r) => r.email === email).length };
  }
}

type StoredOrder = OrderView & { paymentIntentId: string | null; couponId: string | null };

export class MemoryOrderRepository implements OrderRepository {
  readonly orders: StoredOrder[] = [];
  private counter = 0;

  constructor(
    private readonly capacity = 8,
    private readonly coupons?: MemoryCouponRepository,
  ) {}

  async slotLoad(from: Date, to: Date): Promise<Map<number, number>> {
    const load = new Map<number, number>();
    for (const order of this.orders) {
      if (!order.slotStart || order.slotStart < from || order.slotStart >= to) continue;
      if (["cancelled", "expired", "refunded"].includes(order.status)) continue;
      load.set(order.slotStart.getTime(), (load.get(order.slotStart.getTime()) ?? 0) + 1);
    }
    return load;
  }

  async create(order: NewOrder): Promise<{ id: string; trackingToken: string } | "slot_full" | "code_taken"> {
    if (this.orders.some((o) => o.code === order.code)) return "code_taken";
    if (order.slotStart) {
      const taken = (await this.slotLoad(order.slotStart, new Date(order.slotStart.getTime() + 1))).get(order.slotStart.getTime()) ?? 0;
      if (taken >= this.capacity) return "slot_full";
    }
    this.counter += 1;
    const stored: StoredOrder = {
      id: `order-${this.counter}`,
      code: order.code,
      status: "pending_payment",
      customerId: order.customerId,
      trackingToken: `token-${this.counter}`,
      contactName: order.contact.name,
      contactEmail: order.contact.email,
      locale: order.locale,
      fulfilment: order.fulfilment,
      slotStart: order.slotStart,
      deliveryAddress: order.deliveryAddress,
      subtotal: order.subtotal,
      discount: order.discount,
      deliveryFee: order.deliveryFee,
      total: order.total,
      vat: order.vat,
      lines: order.lines,
      createdAt: new Date(),
      paymentIntentId: null,
      couponId: order.couponId,
    };
    this.orders.push(stored);
    return { id: stored.id, trackingToken: stored.trackingToken };
  }

  async attachPayment(orderId: string, paymentIntentId: string): Promise<void> {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) order.paymentIntentId = paymentIntentId;
  }

  async confirmPayment(paymentIntentId: string): Promise<{ orderId: string; confirmedNow: boolean } | null> {
    const index = this.orders.findIndex((o) => o.paymentIntentId === paymentIntentId);
    const order = this.orders[index];
    if (!order) return null;
    if (order.status !== "pending_payment" && order.status !== "expired") return { orderId: order.id, confirmedNow: false };
    this.orders[index] = { ...order, status: "received" };
    if (order.couponId) this.coupons?.redemptions.push({ couponId: order.couponId, email: order.contactEmail });
    return { orderId: order.id, confirmedNow: true };
  }

  async byId(id: string): Promise<OrderView | null> {
    return this.orders.find((o) => o.id === id) ?? null;
  }

  async byCode(code: string): Promise<OrderView | null> {
    return this.orders.find((o) => o.code === code) ?? null;
  }

  async paidOrderCount(email: string, customerId: UserId | null): Promise<number> {
    return this.orders.filter(
      (o) =>
        o.status !== "pending_payment" &&
        o.status !== "expired" &&
        (o.contactEmail === email || (customerId !== null && o.customerId === customerId)),
    ).length;
  }
}

export class MemoryPaymentGateway implements PaymentGateway {
  readonly intents: { id: string; orderId: string; amountCents: number }[] = [];

  async createIntent(input: { orderId: string; amount: { cents: number } }): Promise<PaymentIntent> {
    const id = `pi_${this.intents.length + 1}`;
    this.intents.push({ id, orderId: input.orderId, amountCents: input.amount.cents });
    return { id, clientSecret: `${id}_secret` };
  }

  parseWebhook(rawBody: string, signature: string): PaymentEvent {
    if (signature !== "valid") throw new Error("Invalid signature");
    return JSON.parse(rawBody) as PaymentEvent;
  }
}

export class SequenceRandom implements Random {
  private index = 0;

  constructor(private readonly values: number[]) {}

  next(): number {
    const value = this.values[this.index % this.values.length]!;
    this.index += 1;
    return value;
  }
}
