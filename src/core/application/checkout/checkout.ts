import { actorFor, GUEST, type Actor, type UserId } from "@/core/domain/access/actor";
import { priceCart, type Cart, type PricedCart } from "@/core/domain/cart/cart";
import { quoteDelivery, type DeliveryQuote } from "@/core/domain/fulfilment/delivery";
import { findSlot, pickupDays, type PickupDay } from "@/core/domain/fulfilment/pickup-slots";
import { checkoutTotals, pickupCode, type Totals } from "@/core/domain/ordering/checkout";
import { applyCoupon, normaliseCode, type CouponResult } from "@/core/domain/promotions/coupon";
import { isLocale, type Locale } from "@/core/domain/shared/locale";
import { ZERO } from "@/core/domain/shared/money";
import { addDays, localDate, weekdayOf, zonedInstant } from "@/core/domain/shared/zoned-time";
import type { CatalogRepository } from "../ports/catalog-repository";
import type {
  CouponRepository,
  DeliveryAddress,
  OrderLineSnapshot,
  OrderRepository,
  PaymentGateway,
  Random,
  SettingsRepository,
  ShopSettings,
} from "../ports/checkout";
import type { Clock } from "../ports/clock";
import type { Identity } from "../ports/identity";
import type { Mailer } from "../ports/mailer";
import { RATE_RULES, type RateLimiter } from "../ports/rate-limiter";

export type Fulfilment = { kind: "pickup"; slotStart: Date | null } | { kind: "delivery"; address: DeliveryAddress };

export type CheckoutOptions = Readonly<{
  ordersPaused: boolean;
  days: readonly PickupDay[];
  delivery: ShopSettings["delivery"];
  timeZone: string;
}>;

export type CheckoutQuote = Readonly<{
  cart: PricedCart;
  totals: Totals;
  delivery: DeliveryQuote | null;
  coupon: (CouponResult & { code: string }) | null;
}>;

type Dependencies = {
  catalog: CatalogRepository;
  settings: SettingsRepository;
  orders: OrderRepository;
  coupons: CouponRepository;
  clock: Clock;
};

export async function loadDays(settings: ShopSettings, orders: OrderRepository, now: Date): Promise<PickupDay[]> {
  const today = localDate(now, settings.timeZone);
  const from = zonedInstant(today, 0, settings.timeZone);
  const to = zonedInstant(addDays(today, settings.daysAhead + 1), 0, settings.timeZone);
  const load = await orders.slotLoad(from, to);
  return pickupDays({
    now,
    schedule: settings.schedule,
    closures: settings.closures,
    settings: {
      timeZone: settings.timeZone,
      slotMinutes: settings.slotMinutes,
      prepMinutes: settings.prepMinutes,
      capacity: settings.slotCapacity,
      daysAhead: settings.daysAhead,
    },
    load,
  });
}

export function makeGetCheckoutOptions({ settings, orders, clock }: Pick<Dependencies, "settings" | "orders" | "clock">) {
  return async (): Promise<CheckoutOptions> => {
    const shop = await settings.load();
    return {
      ordersPaused: shop.ordersPaused,
      days: await loadDays(shop, orders, clock.now()),
      delivery: shop.delivery,
      timeZone: shop.timeZone,
    };
  };
}

async function quote(
  deps: Dependencies,
  shop: ShopSettings,
  input: { cart: Cart; fulfilment: Fulfilment; couponCode: string | null; email: string | null; customerId: UserId | null },
): Promise<CheckoutQuote & { couponId: string | null }> {
  const now = deps.clock.now();
  const cart = priceCart(input.cart, await deps.catalog.all());

  const delivery =
    input.fulfilment.kind === "delivery"
      ? quoteDelivery({
          postalCode: input.fulfilment.address.postalCode,
          subtotal: cart.subtotal,
          now,
          weekday: weekdayOf(localDate(now, shop.timeZone)),
          schedule: shop.schedule,
          settings: { ...shop.delivery, timeZone: shop.timeZone },
        })
      : null;

  let coupon: CheckoutQuote["coupon"] = null;
  let couponId: string | null = null;
  if (input.couponCode) {
    const code = normaliseCode(input.couponCode);
    const stored = await deps.coupons.byCode(code);
    if (!stored) coupon = { ok: false, error: "inactive", code };
    else {
      const email = input.email?.trim().toLowerCase() ?? "";
      const uses = await deps.coupons.uses(stored.id, email);
      const paid = email || input.customerId ? await deps.orders.paidOrderCount(email, input.customerId) : 0;
      const result = applyCoupon(stored, {
        subtotal: cart.subtotal,
        now,
        totalUses: uses.total,
        customerUses: uses.customer,
        isFirstOrder: paid === 0,
      });
      coupon = { ...result, code: stored.code };
      if (result.ok) couponId = stored.id;
    }
  }

  const totals = checkoutTotals({
    subtotal: cart.subtotal,
    discount: coupon?.ok ? coupon.discount : ZERO,
    deliveryFee: delivery?.ok ? delivery.fee : ZERO,
    vatRateBasisPoints: shop.vatRateBasisPoints,
  });
  return { cart, totals, delivery, coupon, couponId };
}

export function makeQuoteCheckout(deps: Dependencies & { identity: Identity }) {
  return async (input: { cart: Cart; fulfilment: Fulfilment; couponCode: string | null; email: string | null }): Promise<CheckoutQuote> => {
    const user = await deps.identity.currentUser();
    const result = await quote(deps, await deps.settings.load(), {
      ...input,
      email: input.email ?? user?.email ?? null,
      customerId: user?.id ?? null,
    });
    return { cart: result.cart, totals: result.totals, delivery: result.delivery, coupon: result.coupon };
  };
}

export type PlaceOrderInput = Readonly<{
  cart: Cart;
  contact: { name: string; email: string; phone: string };
  fulfilment: Fulfilment;
  notes: string;
  couponCode: string | null;
  locale: string;
  clientKey: string;
}>;

export type PlaceOrderError =
  | "rate_limited"
  | "orders_paused"
  | "empty_cart"
  | "cart_changed"
  | "invalid_contact"
  | "slot_unavailable"
  | "slot_full"
  | "delivery_unavailable"
  | "coupon_invalid";

export type PlaceOrderResult =
  | Readonly<{ ok: true; code: string; trackingToken: string; clientSecret: string; total: Totals["total"] }>
  | Readonly<{ ok: false; error: PlaceOrderError }>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ]{9,16}$/;

export function snapshot(cart: PricedCart): OrderLineSnapshot[] {
  return cart.lines.map(({ drink, line, total }) => ({
    productId: drink.product.id,
    productName: drink.product.name,
    options: drink.choices.flatMap((c) =>
      c.options.map((o) => ({ group: c.group.code, code: o.code, name: o.name, priceDeltaCents: o.priceDelta.cents })),
    ),
    unitPrice: drink.unitPrice,
    quantity: line.quantity,
    total,
  }));
}

export function makePlaceOrder(
  deps: Dependencies & { identity: Identity; payments: PaymentGateway; random: Random; limiter: RateLimiter },
) {
  return async (input: PlaceOrderInput): Promise<PlaceOrderResult> => {
    const shop = await deps.settings.load();
    if (shop.ordersPaused) return { ok: false, error: "orders_paused" };
    if (input.cart.length === 0) return { ok: false, error: "empty_cart" };

    const contact = { name: input.contact.name.trim(), email: input.contact.email.trim().toLowerCase(), phone: input.contact.phone.trim() };
    if (!contact.name || contact.name.length > 80 || !EMAIL.test(contact.email) || !PHONE.test(contact.phone)) {
      return { ok: false, error: "invalid_contact" };
    }
    if (!(await deps.limiter.hit(`place-order:${input.clientKey}`, RATE_RULES.placeOrder))) return { ok: false, error: "rate_limited" };

    const user = await deps.identity.currentUser();
    const actor: Actor = user ? actorFor(user) : GUEST;
    const customerId = actor.kind === "guest" ? null : actor.id;
    const result = await quote(deps, shop, {
      cart: input.cart,
      fulfilment: input.fulfilment,
      couponCode: input.couponCode,
      email: contact.email,
      customerId,
    });
    if (result.cart.issues.length > 0 || result.cart.lines.length === 0) return { ok: false, error: "cart_changed" };
    if (input.couponCode && !result.coupon?.ok) return { ok: false, error: "coupon_invalid" };

    let slotStart: Date | null = null;
    if (input.fulfilment.kind === "pickup") {
      const days = await loadDays(shop, deps.orders, deps.clock.now());
      const slot = input.fulfilment.slotStart ? findSlot(days, input.fulfilment.slotStart) : null;
      if (!slot || slot.status !== "available") return { ok: false, error: "slot_unavailable" };
      slotStart = slot.start;
    } else if (!result.delivery?.ok) return { ok: false, error: "delivery_unavailable" };

    const locale: Locale = isLocale(input.locale) ? input.locale : "es";
    const notes = input.notes.trim().slice(0, 300) || null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = pickupCode(() => deps.random.next());
      const created = await deps.orders.create({
        code,
        customerId,
        contact,
        locale,
        fulfilment: input.fulfilment.kind,
        slotStart,
        deliveryAddress: input.fulfilment.kind === "delivery" ? input.fulfilment.address : null,
        notes,
        ...result.totals,
        couponId: result.couponId,
        lines: snapshot(result.cart),
      });
      if (created === "slot_full") return { ok: false, error: "slot_full" };
      if (created === "code_taken") continue;
      const intent = await deps.payments.createIntent({ orderId: created.id, code, amount: result.totals.total, email: contact.email });
      await deps.orders.attachPayment(created.id, intent.id);
      return { ok: true, code, trackingToken: created.trackingToken, clientSecret: intent.clientSecret, total: result.totals.total };
    }
    throw new Error("Could not find a free pickup code");
  };
}

export function makeConfirmPayment(deps: {
  orders: OrderRepository;
  payments: PaymentGateway;
  mailer: Mailer;
  trackingUrl: (code: string, token: string, locale: Locale) => string;
}) {
  return async (rawBody: string, signature: string): Promise<"confirmed" | "already_confirmed" | "ignored"> => {
    const event = deps.payments.parseWebhook(rawBody, signature);
    if (event.type !== "succeeded" || !event.paymentIntentId) return "ignored";
    const confirmed = await deps.orders.confirmPayment(event.paymentIntentId);
    if (!confirmed) return "ignored";
    if (!confirmed.confirmedNow) return "already_confirmed";
    const order = await deps.orders.byId(confirmed.orderId);
    if (order) {
      await deps.mailer.send({
        kind: "order_confirmed",
        to: order.contactEmail,
        name: order.contactName,
        locale: order.locale,
        code: order.code,
        url: deps.trackingUrl(order.code, order.trackingToken, order.locale),
        total: order.total,
        fulfilment: order.fulfilment,
        slotStart: order.slotStart,
        lines: order.lines.map((l) => ({ name: l.productName, quantity: l.quantity })),
      });
    }
    return "confirmed";
  };
}
