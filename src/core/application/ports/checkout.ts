import type { UserId } from "@/core/domain/access/actor";
import type { CartLine } from "@/core/domain/cart/cart";
import type { WeeklySchedule } from "@/core/domain/fulfilment/opening-hours";
import type { OrderStatus } from "@/core/domain/ordering/order-status";
import type { OrderEvent } from "@/core/domain/ordering/timeline";
import type { Coupon } from "@/core/domain/promotions/coupon";
import type { Locale, LocalizedText } from "@/core/domain/shared/locale";
import type { Money } from "@/core/domain/shared/money";
import type { LocalDate } from "@/core/domain/shared/zoned-time";

export type ShopSettings = Readonly<{
  timeZone: string;
  prepMinutes: number;
  slotMinutes: number;
  slotCapacity: number;
  daysAhead: number;
  ordersPaused: boolean;
  unpaidHoldMinutes: number;
  vatRateBasisPoints: number;
  schedule: WeeklySchedule;
  closures: readonly LocalDate[];
  delivery: Readonly<{
    enabled: boolean;
    zones: readonly string[];
    minimum: Money;
    fee: Money;
    freeFrom: Money;
    lastOrderMinutes: number;
    etaMin: number;
    etaMax: number;
  }>;
}>;

export interface SettingsRepository {
  load(): Promise<ShopSettings>;
}

export type StoredCoupon = Coupon & Readonly<{ id: string }>;

export interface CouponRepository {
  byCode(code: string): Promise<StoredCoupon | null>;
  uses(couponId: string, email: string): Promise<{ total: number; customer: number }>;
}

export type DeliveryAddress = Readonly<{
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  instructions: string | null;
}>;

export type OrderLineSnapshot = Readonly<{
  productId: string;
  productName: string;
  options: readonly { group: string; code: string; name: LocalizedText; priceDeltaCents: number }[];
  unitPrice: Money;
  quantity: number;
  total: Money;
}>;

export type NewOrder = Readonly<{
  code: string;
  customerId: UserId | null;
  contact: Readonly<{ name: string; email: string; phone: string }>;
  locale: Locale;
  fulfilment: "pickup" | "delivery";
  slotStart: Date | null;
  deliveryAddress: DeliveryAddress | null;
  notes: string | null;
  subtotal: Money;
  discount: Money;
  deliveryFee: Money;
  total: Money;
  vat: Money;
  couponId: string | null;
  lines: readonly OrderLineSnapshot[];
  isDemo?: boolean;
}>;

export type OrderView = Readonly<{
  id: string;
  code: string;
  status: OrderStatus;
  customerId: UserId | null;
  trackingToken: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  locale: Locale;
  fulfilment: "pickup" | "delivery";
  slotStart: Date | null;
  deliveryAddress: DeliveryAddress | null;
  notes: string | null;
  isDemo: boolean;
  paymentIntentId: string | null;
  refunded: Money;
  subtotal: Money;
  discount: Money;
  deliveryFee: Money;
  total: Money;
  vat: Money;
  lines: readonly OrderLineSnapshot[];
  events: readonly OrderEvent[];
  createdAt: Date;
}>;

export type OrderSummary = Readonly<{
  code: string;
  status: OrderStatus;
  fulfilment: "pickup" | "delivery";
  slotStart: Date | null;
  createdAt: Date;
  items: number;
  total: Money;
}>;

export type AdvanceResult = "advanced" | "invalid_transition" | "not_found";

export type BoardCard = Readonly<{
  id: string;
  code: string;
  status: OrderStatus;
  fulfilment: "pickup" | "delivery";
  slotStart: Date | null;
  createdAt: Date;
  isDemo: boolean;
  postalCode: string | null;
  notes: string | null;
  lines: readonly Readonly<{ name: string; quantity: number }>[];
  total: Money;
}>;

export interface OrderRepository {
  slotLoad(from: Date, to: Date): Promise<Map<number, number>>;
  create(order: NewOrder): Promise<{ id: string; trackingToken: string } | "slot_full" | "code_taken">;
  attachPayment(orderId: string, paymentIntentId: string): Promise<void>;
  confirmPayment(paymentIntentId: string): Promise<{ orderId: string; confirmedNow: boolean } | null>;
  byId(id: string): Promise<OrderView | null>;
  byCode(code: string): Promise<OrderView | null>;
  paidOrderCount(email: string, customerId: UserId | null): Promise<number>;
  listByCustomer(customerId: UserId, limit: number, before: Date | null): Promise<OrderSummary[]>;
  advance(orderId: string, next: OrderStatus, actorId: UserId | null): Promise<AdvanceResult>;
  assignCustomer(orderId: string, customerId: UserId): Promise<boolean>;
  board(from: Date, to: Date): Promise<BoardCard[]>;
  recordRefund(orderId: string, amount: Money): Promise<void>;
  expireUnpaid(): Promise<number>;
}

export type PaymentIntent = Readonly<{ id: string; clientSecret: string }>;

export type PaymentEvent = Readonly<{ type: "succeeded" | "failed" | "ignored"; paymentIntentId: string | null }>;

export interface PaymentGateway {
  createIntent(input: { orderId: string; code: string; amount: Money; email: string }): Promise<PaymentIntent>;
  refund(input: { orderId: string; paymentIntentId: string; amount: Money }): Promise<void>;
  parseWebhook(rawBody: string, signature: string): PaymentEvent;
}

export interface Random {
  next(): number;
}

export type { CartLine };
