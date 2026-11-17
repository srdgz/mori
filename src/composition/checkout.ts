import "server-only";
import { randomInt } from "node:crypto";
import { cache } from "react";
import Stripe from "stripe";
import { makeConfirmPayment, makeGetCheckoutOptions, makePlaceOrder, makeQuoteCheckout } from "@/core/application/checkout/checkout";
import { makeGetOrder, makeSyncCart } from "@/core/application/checkout/orders";
import type { PaymentGateway } from "@/core/application/ports/checkout";
import type { Locale } from "@/core/domain/shared/locale";
import { systemClock } from "@/infrastructure/clock";
import { getDatabase } from "@/infrastructure/db/client";
import { DrizzleCatalogRepository } from "@/infrastructure/db/drizzle-catalog-repository";
import {
  DrizzleCouponRepository,
  DrizzleOrderRepository,
  DrizzleSettingsRepository,
} from "@/infrastructure/db/drizzle-checkout-repositories";
import { DrizzleSavedCartRepository } from "@/infrastructure/db/drizzle-saved-carts";
import { StripePaymentGateway } from "@/infrastructure/stripe/stripe-gateway";
import { getPathname } from "@/i18n/navigation";
import { baseURL, getIdentity, getMailer } from "./auth";

let gateway: PaymentGateway | undefined;

function payments(): PaymentGateway {
  if (gateway) return gateway;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  gateway = new StripePaymentGateway(new Stripe(key), process.env.STRIPE_WEBHOOK_SECRET ?? null);
  return gateway;
}

export function trackingUrl(code: string, token: string, locale: Locale): string {
  const path = getPathname({ locale, href: { pathname: "/order/[code]", params: { code } } });
  return `${baseURL()}${path}?t=${token}`;
}

function build() {
  const db = getDatabase();
  const identity = getIdentity();
  const deps = {
    catalog: new DrizzleCatalogRepository(db),
    settings: new DrizzleSettingsRepository(db),
    orders: new DrizzleOrderRepository(db),
    coupons: new DrizzleCouponRepository(db),
    clock: systemClock,
    identity,
  };
  return {
    getCheckoutOptions: makeGetCheckoutOptions(deps),
    quoteCheckout: makeQuoteCheckout(deps),
    placeOrder: (...args: Parameters<ReturnType<typeof makePlaceOrder>>) =>
      makePlaceOrder({ ...deps, payments: payments(), random: { next: () => randomInt(0, 1_000_000) / 1_000_000 } })(...args),
    confirmPayment: (...args: Parameters<ReturnType<typeof makeConfirmPayment>>) =>
      makeConfirmPayment({ orders: deps.orders, payments: payments(), mailer: getMailer(), trackingUrl })(...args),
    getOrder: makeGetOrder(deps.orders, identity),
    syncCart: makeSyncCart(new DrizzleSavedCartRepository(db), identity),
  };
}

export const checkout = cache(build);

export const paymentsEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
