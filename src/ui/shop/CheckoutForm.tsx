"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Appearance, type Stripe, type StripeElements } from "@stripe/stripe-js";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { CheckoutQuote } from "@/core/application/checkout/checkout";
import type { Address } from "@/core/domain/account/address";
import type { Cart } from "@/core/domain/cart/cart";
import { firstAvailable, type PickupDay } from "@/core/domain/fulfilment/pickup-slots";
import { paymentMode } from "@/core/domain/ordering/checkout";
import type { Locale } from "@/core/domain/shared/locale";
import { lineKey } from "@/core/domain/cart/cart";
import { localize } from "@/core/domain/shared/locale";
import { formatMoney, subtract, ZERO, type Money } from "@/core/domain/shared/money";
import { getPathname, Link } from "@/i18n/navigation";
import { Submit } from "@/ui/account/form";
import { cx } from "@/ui/primitives/cx";
import { Icon } from "@/ui/primitives/Icon";
import { CartIssues, CartLines } from "./CartLines";
import { FreeDeliveryBar, useCartContext } from "./CartProvider";
import { useCart } from "./cart-store";

type AddressFields = { line1: string; line2: string; postalCode: string; city: string; instructions: string };

type FulfilmentInput =
  | { kind: "pickup"; slotStart: string | null }
  | { kind: "delivery"; address: { line1: string; line2: string | null; postalCode: string; city: string; instructions: string | null } };

type PlaceResult =
  { ok: true; code: string; trackingToken: string; clientSecret: string | null; total: Money } | { ok: false; error: string };

export type CheckoutActions = {
  quote: (input: {
    cart: Cart;
    fulfilment: FulfilmentInput;
    couponCode: string | null;
    email: string | null;
    redeemLine: string | null;
  }) => Promise<CheckoutQuote | null>;
  place: (input: {
    cart: Cart;
    contact: { name: string; email: string; phone: string };
    fulfilment: FulfilmentInput;
    notes: string;
    couponCode: string | null;
    redeemLine: string | null;
    locale: string;
  }) => Promise<PlaceResult>;
};

type Props = {
  days: readonly PickupDay[];
  deliveryEta: { min: number; max: number };
  user: { name: string; email: string; phone: string | null } | null;
  addresses: readonly Address[];
  publishableKey: string | null;
  actions: CheckoutActions;
};

const appearance: Appearance = {
  theme: "flat",
  variables: {
    colorPrimary: "#183d2b",
    colorBackground: "#ffffff",
    colorText: "#252725",
    colorDanger: "#a23b24",
    fontFamily: "DM Sans, system-ui, sans-serif",
    borderRadius: "12px",
    spacingUnit: "4px",
  },
  rules: { ".Input": { boxShadow: "inset 0 0 0 1.5px rgba(37,39,37,.28)" }, ".Input:focus": { boxShadow: "inset 0 0 0 2px #183d2b" } },
};

function emptyAddress(): AddressFields {
  return { line1: "", line2: "", postalCode: "", city: "Madrid", instructions: "" };
}

function dayLabel(date: string, index: number, t: ReturnType<typeof useTranslations>, locale: Locale): string {
  const formatted = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
  return index === 0 ? `${t("today")} · ${formatted}` : `${t("tomorrow")} · ${formatted}`;
}

type Bridge = { stripe: Stripe | null; elements: StripeElements | null };

function StripeBridge({ onChange }: { onChange: (bridge: Bridge) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  useEffect(() => {
    onChange({ stripe, elements });
  }, [onChange, stripe, elements]);
  return null;
}

const stripeByKey = new Map<string, Promise<Stripe | null>>();

function stripeFor(key: string): Promise<Stripe | null> {
  const existing = stripeByKey.get(key);
  if (existing) return existing;
  const created = loadStripe(key);
  stripeByKey.set(key, created);
  return created;
}

export function CheckoutForm({ days, deliveryEta, user, addresses, publishableKey, actions }: Props) {
  const t = useTranslations("shop.checkout");
  const locale = useLocale() as Locale;
  const { lines, ready } = useCart();
  const { priced, catalog, freeFrom } = useCartContext();

  const [contact, setContact] = useState({ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" });
  const [kind, setKind] = useState<"pickup" | "delivery">("pickup");
  const [dayIndex, setDayIndex] = useState(0);
  const [slotStart, setSlotStart] = useState<string | null>(() => firstAvailable(days)?.start.toISOString() ?? null);
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState<string>(defaultAddress?.id ?? "new");
  const [address, setAddress] = useState<AddressFields>(emptyAddress);
  const [notes, setNotes] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [redeemLine, setRedeemLine] = useState<string | null>(null);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const bridge = useRef<Bridge>({ stripe: null, elements: null });
  const setBridge = useCallback((next: Bridge) => {
    bridge.current = next;
  }, []);
  const [placed, setPlaced] = useState<{ key: string; result: Extract<PlaceResult, { ok: true }> } | null>(null);

  const fulfilment: FulfilmentInput = useMemo(() => {
    if (kind === "pickup") return { kind, slotStart };
    const saved = addresses.find((a) => a.id === addressId);
    const fields = saved
      ? { line1: saved.line1, line2: saved.line2, postalCode: saved.postalCode, city: saved.city, instructions: saved.instructions }
      : {
          line1: address.line1,
          line2: address.line2 || null,
          postalCode: address.postalCode,
          city: address.city,
          instructions: address.instructions || null,
        };
    return { kind, address: fields };
  }, [kind, slotStart, addresses, addressId, address]);

  useEffect(() => {
    if (!ready || lines.length === 0) return;
    let active = true;
    const timer = setTimeout(() => {
      actions
        .quote({ cart: lines, fulfilment, couponCode: coupon, email: contact.email || null, redeemLine })
        .then((result) => active && setQuote(result))
        .catch(() => undefined);
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [actions, lines, fulfilment, coupon, contact.email, ready, redeemLine]);

  const total = quote?.totals.total ?? priced.subtotal;
  const mode = quote ? paymentMode(quote.totals.total) : "card";
  const stripePromise = publishableKey ? stripeFor(publishableKey) : null;

  if (ready && lines.length === 0) {
    return (
      <div className="grid justify-items-start gap-3">
        <p className="font-semibold text-forest">{t("emptyTitle")}</p>
        <Link href="/menu" className="btn mt-2">
          {t("summary")}
        </Link>
      </div>
    );
  }

  const deliveryError = quote?.delivery && !quote.delivery.ok ? quote.delivery : null;
  const couponState = quote?.coupon ?? null;
  const loyaltyDiscount = quote?.loyalty?.redemption?.discount ?? null;
  const couponDiscount = quote ? subtract(quote.totals.discount, loyaltyDiscount ?? ZERO) : ZERO;
  const feeLabel =
    kind === "delivery" && !quote?.delivery
      ? t("feePending")
      : deliveryError
        ? t("feeUnavailable")
        : quote && quote.totals.deliveryFee.cents > 0
          ? formatMoney(quote.totals.deliveryFee, locale)
          : t("free");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (paying) return;
    if (mode === "below_card_minimum") {
      setError(t("errors.below_card_minimum"));
      return;
    }
    const { stripe, elements } = bridge.current;
    if (mode === "card" && (!stripe || !elements)) return;
    setError("");
    setPaying(true);
    try {
      if (stripe && elements && mode === "card") await pay(stripe, elements);
      else await confirmFree();
    } finally {
      setPaying(false);
    }
  }

  async function placeOnce(): Promise<Extract<PlaceResult, { ok: true }> | null> {
    const key = JSON.stringify({ lines, fulfilment, coupon, contact, notes, redeemLine });
    if (placed?.key === key) return placed.result;
    const response = await actions.place({ cart: lines, contact, fulfilment, notes, couponCode: coupon, redeemLine, locale });
    if (!response.ok) {
      const errorKey = `errors.${response.error}` as "errors.generic";
      setError(t.has(errorKey) ? t(errorKey) : t("errors.generic"));
      return null;
    }
    setPlaced({ key, result: response });
    return response;
  }

  function trackingHref(result: Extract<PlaceResult, { ok: true }>): string {
    const path = getPathname({ locale, href: { pathname: "/order/[code]", params: { code: result.code } } });
    return `${window.location.origin}${path}?t=${result.trackingToken}`;
  }

  async function confirmFree() {
    const result = await placeOnce();
    if (!result) return;
    if (result.clientSecret) {
      setError(t("errors.cart_changed"));
      return;
    }
    window.location.assign(trackingHref(result));
  }

  async function pay(stripe: Stripe, elements: StripeElements) {
    const submitted = await elements.submit();
    if (submitted.error) {
      setError(submitted.error.message ?? t("errors.generic"));
      return;
    }
    const result = await placeOnce();
    if (!result) return;
    if (!result.clientSecret) {
      window.location.assign(trackingHref(result));
      return;
    }
    const confirmation = await stripe.confirmPayment({
      elements,
      clientSecret: result.clientSecret,
      confirmParams: { return_url: trackingHref(result) },
    });
    if (confirmation.error) setError(t("errors.payment", { message: confirmation.error.message ?? "" }));
  }

  const day = days[dayIndex];

  const form = (
    <form className="checkout" noValidate onSubmit={onSubmit}>
      <div className="grid gap-5">
        <section className="account-card grid gap-4" aria-labelledby="contact-h">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="contact-h" className="font-semibold text-forest">
              1 · {t("contactTitle")}
            </h2>
            {!user && (
              <p className="text-sm text-ink-soft">
                {t("haveAccount")}{" "}
                <Link
                  href={{ pathname: "/account/sign-in", query: { next: getPathname({ locale, href: "/checkout" }) } }}
                  className="link-u text-forest"
                >
                  {t("signIn")}
                </Link>
              </p>
            )}
          </div>
          {user && <p className="text-sm text-ink-soft">{t("signedInAs", { name: user.name })}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field sm:col-span-2">
              <label htmlFor="co-name" className="field-label">
                {t("name")}
              </label>
              <input
                id="co-name"
                autoComplete="name"
                required
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="co-email" className="field-label">
                {t("email")}
              </label>
              <input
                id="co-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="co-phone" className="field-label">
                {t("phone")}
              </label>
              <input
                id="co-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              />
            </div>
          </div>
          {!user && <p className="text-sm text-ink-soft">{t("guestNote")}</p>}
        </section>

        <section className="account-card grid gap-4" aria-labelledby="fulfilment-h">
          <h2 id="fulfilment-h" className="font-semibold text-forest">
            2 · {t("fulfilmentTitle")}
          </h2>
          <div className="opt-grid" role="radiogroup" aria-labelledby="fulfilment-h">
            {(["pickup", "delivery"] as const).map((value) => (
              <label key={value} className="opt">
                <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} />
                <span>{t(value)}</span>
              </label>
            ))}
          </div>

          {kind === "pickup" ? (
            days.length === 0 ? (
              <p className="form-note">{t("noSlots")}</p>
            ) : (
              <div className="grid gap-3">
                <p className="text-sm text-ink-soft">{t("pickupAt")}</p>
                {days.length > 1 && (
                  <div className="opt-grid">
                    {days.map((d, i) => (
                      <label key={d.date} className="opt">
                        <input type="radio" name="day" checked={dayIndex === i} onChange={() => setDayIndex(i)} />
                        <span>{dayLabel(d.date, i, t, locale)}</span>
                      </label>
                    ))}
                  </div>
                )}
                <fieldset className="opt-group">
                  <legend className="opt-group__legend">{t("slotsLabel")}</legend>
                  <div className="slot-grid">
                    {day?.slots.map((slot) => {
                      const value = slot.start.toISOString();
                      const full = slot.status === "full";
                      return (
                        <label key={value} className="opt opt--slot">
                          <input
                            type="radio"
                            name="slot"
                            value={value}
                            disabled={full}
                            checked={slotStart === value}
                            onChange={() => setSlotStart(value)}
                            aria-label={full ? t("slotFull", { time: slot.label }) : slot.label}
                          />
                          <span aria-hidden="true">{slot.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            )
          ) : (
            <div className="grid gap-4">
              {addresses.length > 0 && (
                <div className="opt-grid">
                  {addresses.map((a) => (
                    <label key={a.id} className="opt">
                      <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                      <span>
                        {a.label} · {a.line1}, {a.postalCode}
                      </span>
                    </label>
                  ))}
                  <label className="opt">
                    <input type="radio" name="address" checked={addressId === "new"} onChange={() => setAddressId("new")} />
                    <span>{t("newAddress")}</span>
                  </label>
                </div>
              )}
              {addressId === "new" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {(["line1", "line2", "postalCode", "city", "instructions"] as const).map((field) => (
                    <div key={field} className={cx("field", (field === "line1" || field === "instructions") && "sm:col-span-2")}>
                      <label htmlFor={`co-${field}`} className="field-label">
                        {t(field)}
                        {(field === "line2" || field === "instructions") && (
                          <span className="font-normal tracking-normal normal-case"> ({t("optional")})</span>
                        )}
                      </label>
                      <input
                        id={`co-${field}`}
                        value={address[field]}
                        inputMode={field === "postalCode" ? "numeric" : undefined}
                        maxLength={field === "postalCode" ? 5 : 200}
                        autoComplete={
                          field === "line1"
                            ? "address-line1"
                            : field === "line2"
                              ? "address-line2"
                              : field === "postalCode"
                                ? "postal-code"
                                : field === "city"
                                  ? "address-level2"
                                  : "off"
                        }
                        onChange={(e) => setAddress({ ...address, [field]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}
              {deliveryError ? (
                <p className="form-note" role="alert">
                  {deliveryError.reason === "below_minimum"
                    ? t("deliveryErrors.below_minimum", { amount: formatMoney(deliveryError.missing, locale) })
                    : t(`deliveryErrors.${deliveryError.reason}`)}
                </p>
              ) : (
                <p className="text-sm text-ink-soft">{t("deliveryEta", deliveryEta)}</p>
              )}
            </div>
          )}

          <div className="field">
            <label htmlFor="co-notes" className="field-label">
              {t("notes")} <span className="font-normal tracking-normal normal-case">({t("optional")})</span>
            </label>
            <input id="co-notes" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </section>

        <section className="account-card grid gap-4" aria-labelledby="payment-h">
          <h2 id="payment-h" className="font-semibold text-forest">
            3 · {t("paymentTitle")}
          </h2>
          {mode === "free" ? (
            <p className="loyalty-note">
              <Icon name="check" size={18} />
              <span>{t("freeNote")}</span>
            </p>
          ) : !publishableKey ? (
            <p className="form-note">{t("errors.unavailable")}</p>
          ) : (
            <>
              <TestCard />
              <PaymentElement options={{ layout: "tabs" }} />
            </>
          )}
          {mode === "below_card_minimum" && !error && <p className="form-note">{t("errors.below_card_minimum")}</p>}
          <p role="alert" className={cx("form-note", !error && "is-empty")}>
            {error}
          </p>
          {(publishableKey || mode === "free") && (
            <div className="buy-bar buy-bar--static">
              {mode === "free" ? (
                <Submit pending={paying} pendingLabel={t("confirming")} className="btn--matcha w-full">
                  {t("confirmFree")}
                </Submit>
              ) : (
                <Submit pending={paying} pendingLabel={t("paying")} className="btn--matcha w-full">
                  {t("pay", { amount: formatMoney(total, locale) })}
                </Submit>
              )}
            </div>
          )}
        </section>
      </div>

      <aside className="checkout__summary account-card grid content-start gap-4" aria-labelledby="summary-h">
        <h2 id="summary-h" className="font-semibold text-forest">
          {t("summary")}
        </h2>
        <CartIssues priced={priced} catalog={catalog} />
        <CartLines priced={priced} />
        <div className="grid gap-2">
          <label htmlFor="co-coupon" className="field-label">
            {t("couponTitle")}
          </label>
          <div className="flex gap-2">
            <input
              id="co-coupon"
              className="coupon-input"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              autoComplete="off"
            />
            {coupon ? (
              <button type="button" className="btn btn--ghost" onClick={() => (setCoupon(null), setCouponInput(""))}>
                {t("removeCoupon")}
              </button>
            ) : (
              <button type="button" className="btn btn--ghost" onClick={() => setCoupon(couponInput.trim() || null)}>
                {t("apply")}
              </button>
            )}
          </div>
          {couponState && (
            <p role="status" className={cx("form-note", couponState.ok && "is-ok")}>
              {couponState.ok
                ? t("couponApplied", { code: couponState.code })
                : couponState.error === "minimum"
                  ? t("couponErrors.minimum", { minimum: formatMoney(couponState.minimum!, locale) })
                  : t(`couponErrors.${couponState.error}`)}
            </p>
          )}
        </div>
        <LoyaltyBox quote={quote} signedIn={!!user} redeemLine={redeemLine} onChange={setRedeemLine} />
        <dl className="totals">
          <div>
            <dt>{t("subtotal")}</dt>
            <dd>{formatMoney(quote?.totals.subtotal ?? priced.subtotal, locale)}</dd>
          </div>
          {loyaltyDiscount && (
            <div>
              <dt>{t("loyalty.line")}</dt>
              <dd>−{formatMoney(loyaltyDiscount, locale)}</dd>
            </div>
          )}
          {quote && couponDiscount.cents > 0 && (
            <div>
              <dt>{t("discount")}</dt>
              <dd>−{formatMoney(couponDiscount, locale)}</dd>
            </div>
          )}
          <div>
            <dt>{kind === "pickup" ? t("pickupFee") : t("deliveryFee")}</dt>
            <dd>{feeLabel}</dd>
          </div>
          <div className="totals__total">
            <dt>{t("total")}</dt>
            <dd aria-live="polite">{formatMoney(total, locale)}</dd>
          </div>
        </dl>
        {kind === "delivery" && quote?.delivery?.ok && <FreeDeliveryBar priced={quote.cart} freeFrom={freeFrom} />}
        {quote && <p className="text-xs text-ink-soft">{t("vat", { amount: formatMoney(quote.totals.vat, locale) })}</p>}
      </aside>
    </form>
  );

  if (!publishableKey || !stripePromise) return form;
  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: "payment",
        amount: Math.max(total.cents, 50),
        currency: "eur",
        appearance,
        locale: locale === "es" ? "es" : "en-GB",
      }}
    >
      <StripeBridge onChange={setBridge} />
      {form}
    </Elements>
  );
}

const TEST_CARD = "4242424242424242";

function TestCard() {
  const t = useTranslations("shop.checkout");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <div className="test-card">
      <p>{t("testCard")}</p>
      <button
        type="button"
        className="test-card__copy"
        onClick={() => {
          void navigator.clipboard?.writeText(TEST_CARD).then(() => setCopied(true));
        }}
      >
        <Icon name={copied ? "check" : "copy"} size={16} />
        <span aria-live="polite">{copied ? t("cardCopied") : t("copyCard")}</span>
      </button>
    </div>
  );
}

function LoyaltyBox({
  quote,
  signedIn,
  redeemLine,
  onChange,
}: {
  quote: CheckoutQuote | null;
  signedIn: boolean;
  redeemLine: string | null;
  onChange: (line: string | null) => void;
}) {
  const t = useTranslations("shop.checkout.loyalty");
  const locale = useLocale() as Locale;
  if (!quote) return null;
  if (!quote.loyalty) {
    if (signedIn) return null;
    return (
      <p className="loyalty-note">
        <Icon name="leaf" size={18} />
        <Link href={{ pathname: "/account/sign-in", query: { next: "/checkout" } }} className="link-u">
          {t("guest")}
        </Link>
      </p>
    );
  }
  const { card } = quote.loyalty;
  if (!card.canRedeem) {
    return (
      <p className="loyalty-note">
        <Icon name="leaf" size={18} />
        <span>{t("progress", { filled: card.filled, required: card.required, earn: quote.cart.items })}</span>
      </p>
    );
  }
  const on = redeemLine !== null;
  const choices = quote.cart.lines;
  const mostExpensive = [...choices].sort((a, b) => b.drink.unitPrice.cents - a.drink.unitPrice.cents)[0];
  return (
    <div className="loyalty-redeem">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className="loyalty-redeem__toggle"
        onClick={() => onChange(on ? null : mostExpensive ? lineKey(mostExpensive.line) : null)}
      >
        <span className="switch__track" aria-hidden="true">
          <span className="switch__thumb" />
        </span>
        <span className="grid text-left">
          <span className="font-semibold">{t("use", { required: card.required })}</span>
          <span className="text-xs">{t("useHint")}</span>
        </span>
      </button>
      {on && (
        <fieldset className="grid gap-2">
          <legend className="field-label mb-2">{t("choose")}</legend>
          {choices.map((priced) => {
            const key = lineKey(priced.line);
            const options = priced.drink.choices.flatMap((c) => c.options.map((o) => localize(o.name, locale))).join(" · ");
            return (
              <label key={key} className="loyalty-redeem__choice">
                <input type="radio" name="redeem-line" checked={redeemLine === key} onChange={() => onChange(key)} />
                <span className="grid flex-1">
                  <span className="font-semibold">{priced.drink.product.name}</span>
                  <span className="text-xs text-ink-soft">{options}</span>
                </span>
                <span>{formatMoney(priced.drink.unitPrice, locale)}</span>
              </label>
            );
          })}
        </fieldset>
      )}
    </div>
  );
}
