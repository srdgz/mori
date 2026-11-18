import { beforeEach, describe, expect, it } from "vitest";
import type { StoredCoupon } from "@/core/application/ports/checkout";
import type { CartLine } from "@/core/domain/cart/cart";
import type { OptionId } from "@/core/domain/catalog/options";
import type { ProductId } from "@/core/domain/catalog/product";
import { money } from "@/core/domain/shared/money";
import { FixedClock } from "@/infrastructure/clock";
import { MemoryCatalogRepository } from "@/infrastructure/memory/memory-catalog-repository";
import {
  defaultShopSettings,
  MemoryCouponRepository,
  MemoryOrderRepository,
  MemoryPaymentGateway,
  MemorySettingsRepository,
  SequenceRandom,
} from "@/infrastructure/memory/memory-checkout";
import { MemoryIdentity } from "@/infrastructure/memory/memory-identity";
import { MemoryMailer } from "@/infrastructure/memory/memory-mailer";
import { MemoryRateLimiter } from "@/infrastructure/memory/memory-rate-limiter";
import { catalogSeed } from "@/infrastructure/seed/catalog";
import { makeConfirmPayment, makeGetCheckoutOptions, makePlaceOrder, makeQuoteCheckout, type PlaceOrderInput } from "./checkout";

const classic = catalogSeed.find((p) => p.slug === "classic-matcha")!;
const vanilla = catalogSeed.find((p) => p.slug === "vanilla-matcha")!;
const ids = (product: typeof classic, codes: string[]) =>
  product.optionGroups.flatMap((g) => g.options.filter((o) => codes.includes(`${g.code}.${o.code}`)).map((o) => o.id));
const classicLarge = ids(classic, ["size.large", "temperature.iced", "milk.oat", "sweetness.regular"]);
const vanillaRegular = ids(vanilla, ["size.regular", "temperature.iced", "milk.whole", "sweetness.regular"]);
const cart: CartLine[] = [
  { productId: classic.id, optionIds: classicLarge, quantity: 2 },
  { productId: vanilla.id, optionIds: vanillaRegular, quantity: 1 },
];

const coupons: StoredCoupon[] = [
  {
    id: "c1",
    code: "BIENVENIDA10",
    kind: "percent",
    value: 10,
    minSubtotal: money(0),
    firstOrderOnly: true,
    maxUses: null,
    perCustomerLimit: 1,
    startsAt: null,
    endsAt: null,
    isActive: true,
  },
  {
    id: "c2",
    code: "MATCHAMIGO",
    kind: "amount",
    value: 200,
    minSubtotal: money(1500),
    firstOrderOnly: false,
    maxUses: null,
    perCustomerLimit: null,
    startsAt: null,
    endsAt: null,
    isActive: true,
  },
];

const now = new Date("2026-11-20T09:07:00Z");
const slot = new Date("2026-11-20T09:45:00Z");
const home = { line1: "C/ del Pez 12", line2: null, postalCode: "28004", city: "Madrid", instructions: null };

let settings: MemorySettingsRepository;
let couponRepo: MemoryCouponRepository;
let orders: MemoryOrderRepository;
let payments: MemoryPaymentGateway;
let identity: MemoryIdentity;
let mailer: MemoryMailer;

function deps() {
  return {
    catalog: new MemoryCatalogRepository(catalogSeed),
    settings,
    orders,
    coupons: couponRepo,
    clock: new FixedClock(now),
    identity,
    payments,
    random: new SequenceRandom([0.1, 0.2, 0.3, 0.4]),
    limiter: new MemoryRateLimiter(new FixedClock(now)),
  };
}

function order(overrides: Partial<PlaceOrderInput> = {}): PlaceOrderInput {
  return {
    cart,
    contact: { name: "Ana López", email: "Ana@Example.com", phone: "+34 600 000 000" },
    fulfilment: { kind: "pickup", slotStart: slot },
    notes: "",
    couponCode: null,
    locale: "es",
    clientKey: "203.0.113.7",
    ...overrides,
  };
}

beforeEach(() => {
  settings = new MemorySettingsRepository();
  couponRepo = new MemoryCouponRepository(coupons);
  orders = new MemoryOrderRepository(8, couponRepo);
  payments = new MemoryPaymentGateway();
  identity = new MemoryIdentity();
  mailer = new MemoryMailer();
});

describe("GetCheckoutOptions", () => {
  it("offers today's slots after preparation time and counts taken places", async () => {
    await makePlaceOrder(deps())(order());
    const options = await makeGetCheckoutOptions(deps())();
    const today = options.days[0]!;
    expect(today.date).toBe("2026-11-20");
    expect(today.slots[0]?.label).toBe("10:30");
    expect(today.slots.find((s) => s.label === "10:45")?.remaining).toBe(7);
    expect(options.delivery.zones).toContain("28004");
  });
});

describe("QuoteCheckout", () => {
  it("prices a pickup order with VAT included", async () => {
    const quote = await makeQuoteCheckout(deps())({ cart, fulfilment: { kind: "pickup", slotStart: null }, couponCode: null, email: null });
    expect(quote.totals).toEqual({ subtotal: money(1680), discount: money(0), deliveryFee: money(0), total: money(1680), vat: money(153) });
    expect(quote.delivery).toBeNull();
  });

  it("adds delivery and applies a first-order coupon", async () => {
    const quote = await makeQuoteCheckout(deps())({
      cart,
      fulfilment: { kind: "delivery", address: home },
      couponCode: "bienvenida10",
      email: "ana@example.com",
    });
    expect(quote.coupon).toEqual({ ok: true, discount: money(168), code: "BIENVENIDA10" });
    expect(quote.totals.total).toEqual(money(1680 - 168 + 250));
  });

  it("explains coupon and delivery problems", async () => {
    const small: CartLine[] = [{ ...cart[1]!, quantity: 1 }];
    const quote = await makeQuoteCheckout(deps())({
      cart: small,
      fulfilment: { kind: "delivery", address: home },
      couponCode: "MATCHAMIGO",
      email: null,
    });
    expect(quote.coupon).toMatchObject({ ok: false, error: "minimum" });
    expect(quote.delivery).toEqual({ ok: false, reason: "below_minimum", missing: money(680) });
    const unknown = await makeQuoteCheckout(deps())({
      cart,
      fulfilment: { kind: "pickup", slotStart: null },
      couponCode: "GRATIS",
      email: null,
    });
    expect(unknown.coupon).toEqual({ ok: false, error: "inactive", code: "GRATIS" });
  });

  it("uses the signed-in customer's email for coupon checks", async () => {
    identity.signInAs(identity.addUser({ email: "ana@example.com" }));
    const quote = await makeQuoteCheckout(deps())({
      cart,
      fulfilment: { kind: "pickup", slotStart: null },
      couponCode: "BIENVENIDA10",
      email: null,
    });
    expect(quote.coupon).toMatchObject({ ok: true });
  });
});

describe("PlaceOrder", () => {
  it("creates a pending pickup order priced on the server and a payment for its total", async () => {
    const result = await makePlaceOrder(deps())(order());
    expect(result).toEqual({ ok: true, code: "MR-DGKP", trackingToken: "token-1", clientSecret: "pi_1_secret", total: money(1680) });
    const stored = orders.orders[0]!;
    expect(stored).toMatchObject({
      status: "pending_payment",
      contactEmail: "ana@example.com",
      slotStart: slot,
      customerId: null,
      paymentIntentId: "pi_1",
    });
    expect(stored.lines.map((l) => [l.productName, l.quantity, l.unitPrice.cents])).toEqual([
      ["Classic Matcha", 2, 580],
      ["Vanilla Matcha", 1, 520],
    ]);
    expect(stored.lines[0]?.options.map((o) => o.code)).toEqual(["large", "iced", "oat", "regular"]);
    expect(payments.intents).toEqual([{ id: "pi_1", orderId: "order-1", amountCents: 1680 }]);
  });

  it("links the order to the signed-in customer", async () => {
    const user = identity.addUser({ email: "ana@example.com" });
    identity.signInAs(user);
    await makePlaceOrder(deps())(order());
    expect(orders.orders[0]?.customerId).toBe(user.id);
  });

  it("creates a delivery order with its address and fee", async () => {
    const result = await makePlaceOrder(deps())(order({ fulfilment: { kind: "delivery", address: home } }));
    expect(result).toMatchObject({ ok: true, total: money(1930) });
    expect(orders.orders[0]).toMatchObject({ fulfilment: "delivery", deliveryAddress: home, slotStart: null });
  });

  it.each([
    ["orders are paused", () => (settings.settings = { ...defaultShopSettings, ordersPaused: true }), order(), "orders_paused"],
    ["the cart is empty", () => undefined, order({ cart: [] }), "empty_cart"],
    ["the email is wrong", () => undefined, order({ contact: { name: "Ana", email: "ana@", phone: "600000000" } }), "invalid_contact"],
    [
      "the name is missing",
      () => undefined,
      order({ contact: { name: " ", email: "ana@example.com", phone: "600000000" } }),
      "invalid_contact",
    ],
    [
      "a drink is no longer offered",
      () => undefined,
      order({ cart: [{ productId: "gone" as ProductId, optionIds: [] as OptionId[], quantity: 1 }] }),
      "cart_changed",
    ],
    ["the coupon doesn't apply", () => undefined, order({ couponCode: "MATCHAMIGO", cart: [cart[1]!] }), "coupon_invalid"],
    [
      "the slot is not offered",
      () => undefined,
      order({ fulfilment: { kind: "pickup", slotStart: new Date("2026-11-20T09:31:00Z") } }),
      "slot_unavailable",
    ],
    ["no slot was chosen", () => undefined, order({ fulfilment: { kind: "pickup", slotStart: null } }), "slot_unavailable"],
    [
      "the address is outside the zone",
      () => undefined,
      order({ fulfilment: { kind: "delivery", address: { ...home, postalCode: "28020" } } }),
      "delivery_unavailable",
    ],
  ])("refuses the order when %s", async (_label, arrange, input, error) => {
    arrange();
    expect(await makePlaceOrder(deps())(input)).toEqual({ ok: false, error });
    expect(payments.intents).toEqual([]);
  });

  it("refuses more than ten orders in ten minutes from the same visitor", async () => {
    const busy = Object.assign(Object.create(Object.getPrototypeOf(orders)), orders, { create: async () => "slot_full" as const });
    const place = makePlaceOrder({ ...deps(), orders: busy });
    for (let i = 0; i < 10; i++) expect(await place(order())).toEqual({ ok: false, error: "slot_full" });
    expect(await place(order())).toEqual({ ok: false, error: "rate_limited" });
    expect(await place(order({ clientKey: "198.51.100.4" }))).toEqual({ ok: false, error: "slot_full" });
  });

  it("refuses a slot that filled up while paying", async () => {
    orders = new MemoryOrderRepository(0, couponRepo);
    settings.settings = { ...defaultShopSettings, slotCapacity: 8 };
    expect(await makePlaceOrder(deps())(order())).toEqual({ ok: false, error: "slot_full" });
  });

  it("refuses a full slot shown as full", async () => {
    settings.settings = { ...defaultShopSettings, slotCapacity: 1 };
    await makePlaceOrder(deps())(order());
    expect(await makePlaceOrder(deps())(order())).toEqual({ ok: false, error: "slot_unavailable" });
  });

  it("tries another code when one is already taken", async () => {
    const place = makePlaceOrder({ ...deps(), random: new SequenceRandom([0.1, 0.2, 0.3, 0.4, 0.1, 0.2, 0.3, 0.4, 0.5, 0.5, 0.5, 0.5]) });
    await place(order());
    const second = await place(order());
    expect(second).toMatchObject({ ok: true, code: "MR-SSSS" });
  });

  it("gives up after five taken codes", async () => {
    const place = makePlaceOrder({ ...deps(), random: new SequenceRandom([0]) });
    await place(order());
    await expect(place(order())).rejects.toThrow("free pickup code");
  });
});

describe("ConfirmPayment", () => {
  const event = (type: string, paymentIntentId: string | null) => JSON.stringify({ type, paymentIntentId });

  it("confirms the order once and emails the customer", async () => {
    await makePlaceOrder(deps())(order({ couponCode: "BIENVENIDA10" }));
    const confirm = makeConfirmPayment({
      orders,
      payments,
      mailer,
      trackingUrl: (code, token) => `https://mori.test/pedido/${code}?t=${token}`,
    });

    expect(await confirm(event("succeeded", "pi_1"), "valid")).toBe("confirmed");
    expect(await confirm(event("succeeded", "pi_1"), "valid")).toBe("already_confirmed");

    expect(orders.orders[0]?.status).toBe("received");
    expect(couponRepo.redemptions).toEqual([{ couponId: "c1", email: "ana@example.com" }]);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]).toMatchObject({
      kind: "order_confirmed",
      to: "ana@example.com",
      code: "MR-DGKP",
      url: "https://mori.test/pedido/MR-DGKP?t=token-1",
      fulfilment: "pickup",
      slotStart: slot,
      lines: [
        { name: "Classic Matcha", quantity: 2 },
        { name: "Vanilla Matcha", quantity: 1 },
      ],
    });
  });

  it("ignores other events and unknown payments", async () => {
    const confirm = makeConfirmPayment({ orders, payments, mailer, trackingUrl: () => "" });
    expect(await confirm(event("failed", "pi_1"), "valid")).toBe("ignored");
    expect(await confirm(event("succeeded", null), "valid")).toBe("ignored");
    expect(await confirm(event("succeeded", "pi_404"), "valid")).toBe("ignored");
    expect(mailer.sent).toEqual([]);
  });

  it("rejects a webhook with a bad signature", async () => {
    const confirm = makeConfirmPayment({ orders, payments, mailer, trackingUrl: () => "" });
    await expect(confirm(event("succeeded", "pi_1"), "forged")).rejects.toThrow("Invalid signature");
  });
});
