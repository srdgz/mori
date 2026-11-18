import "server-only";
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import Stripe from "stripe";
import { makeCancelOrder, makeGetBoard, makeGetStaffOrder, makeRefundOrder, makeSealBoardQuery } from "@/core/application/admin/orders";
import {
  makeGetProductDraft,
  makeListAdminProducts,
  makeSaveProduct,
  makeSetOptionAvailability,
  makeSetProductAvailability,
} from "@/core/application/admin/catalog";
import { makeExpireOrders, makeRunDemoOrders } from "@/core/application/admin/jobs";
import {
  makeCreateCoupon,
  makeEditClosures,
  makeEditZones,
  makeGetDashboard,
  makeGetStoreSettings,
  makeListCoupons,
  makeListCustomers,
  makeSaveStoreSettings,
  makeSetCouponActive,
} from "@/core/application/admin/store";
import { makeConfirmPayment, makeGetCheckoutOptions, makePlaceOrder, makeQuoteCheckout } from "@/core/application/checkout/checkout";
import { makeGetOrder, makeSyncCart } from "@/core/application/checkout/orders";
import {
  makeAdvanceOrderStatus,
  makeClaimOrder,
  makeListOrders,
  makeReorder,
  makeSealOrderQuery,
  makeTrackOrder,
} from "@/core/application/checkout/tracking";
import type { LiveQuerySealer } from "@/core/application/ports/live";
import type { PaymentGateway } from "@/core/application/ports/checkout";
import type { Locale } from "@/core/domain/shared/locale";
import { systemClock } from "@/infrastructure/clock";
import { getDatabase } from "@/infrastructure/db/client";
import { DrizzleAdminCatalogRepository } from "@/infrastructure/db/drizzle-admin-catalog";
import {
  DrizzleAdminCouponRepository,
  DrizzleAdminSettingsRepository,
  DrizzleCustomerDirectory,
  DrizzleSalesReports,
} from "@/infrastructure/db/drizzle-admin-store";
import { DrizzleCatalogRepository } from "@/infrastructure/db/drizzle-catalog-repository";
import {
  DrizzleCouponRepository,
  DrizzleOrderRepository,
  DrizzleSettingsRepository,
} from "@/infrastructure/db/drizzle-checkout-repositories";
import { DrizzleSavedCartRepository } from "@/infrastructure/db/drizzle-saved-carts";
import { NeonLiveQuerySealer } from "@/infrastructure/realtime/neon-live-queries";
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

export const realtimeEnabled = () => Boolean(process.env.NEON_REALTIME_URL && process.env.NEON_REALTIME_SECRET);

function sealer(db: ReturnType<typeof getDatabase>): LiveQuerySealer | null {
  const url = process.env.NEON_REALTIME_URL;
  const secret = process.env.NEON_REALTIME_SECRET;
  const connection = process.env.DATABASE_URL;
  if (!url || !secret || !connection) return null;
  const database = decodeURIComponent(new URL(connection).pathname.slice(1)) || "neondb";
  return new NeonLiveQuerySealer(db, url, { secret, database });
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
    trackOrder: makeTrackOrder(deps.orders, identity),
    listOrders: makeListOrders(deps.orders, identity),
    claimOrder: makeClaimOrder(deps.orders, identity),
    reorder: makeReorder(deps),
    sealOrderQuery: makeSealOrderQuery(deps.orders, identity, sealer(db)),
    advanceOrderStatus: makeAdvanceOrderStatus({ orders: deps.orders, identity, mailer: getMailer(), trackingUrl }),
  };
}

export const checkout = cache(build);

const lazyPayments: PaymentGateway = {
  createIntent: (input) => payments().createIntent(input),
  refund: (input) => payments().refund(input),
  parseWebhook: (rawBody, signature) => payments().parseWebhook(rawBody, signature),
};

function refreshSite() {
  revalidatePath("/", "layout");
}

export const uploadsEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

function buildAdmin() {
  const db = getDatabase();
  const identity = getIdentity();
  const orders = new DrizzleOrderRepository(db);
  const timeZone = "Europe/Madrid";
  const catalogDeps = { catalog: new DrizzleAdminCatalogRepository(db), identity, onChange: refreshSite };
  const couponDeps = { coupons: new DrizzleAdminCouponRepository(db), identity };
  const settingsDeps = { settings: new DrizzleAdminSettingsRepository(db), identity, onChange: refreshSite };
  return {
    getBoard: makeGetBoard({ orders, identity, clock: systemClock, timeZone }),
    getStaffOrder: makeGetStaffOrder({ orders, identity }),
    advanceOrderStatus: makeAdvanceOrderStatus({ orders, identity, mailer: getMailer(), trackingUrl }),
    cancelOrder: makeCancelOrder({ orders, identity, payments: lazyPayments }),
    refundOrder: makeRefundOrder({ orders, identity, payments: lazyPayments }),
    sealBoardQuery: makeSealBoardQuery({ identity, sealer: sealer(db), timeZone }),
    listProducts: makeListAdminProducts(catalogDeps),
    getProductDraft: makeGetProductDraft(catalogDeps),
    saveProduct: makeSaveProduct(catalogDeps),
    setProductAvailability: makeSetProductAvailability(catalogDeps),
    setOptionAvailability: makeSetOptionAvailability(catalogDeps),
    listCoupons: makeListCoupons(couponDeps),
    createCoupon: makeCreateCoupon(couponDeps),
    setCouponActive: makeSetCouponActive(couponDeps),
    getStoreSettings: makeGetStoreSettings(settingsDeps),
    saveStoreSettings: makeSaveStoreSettings(settingsDeps),
    editClosures: makeEditClosures(settingsDeps),
    editZones: makeEditZones(settingsDeps),
    listCustomers: makeListCustomers({ customers: new DrizzleCustomerDirectory(db), identity }),
    getDashboard: makeGetDashboard({ reports: new DrizzleSalesReports(db), identity, clock: systemClock, timeZone }),
  };
}

export const admin = cache(buildAdmin);

export function jobs() {
  const db = getDatabase();
  const orders = new DrizzleOrderRepository(db);
  return {
    expireOrders: makeExpireOrders(orders),
    runDemoOrders: makeRunDemoOrders({
      orders,
      catalog: new DrizzleCatalogRepository(db),
      settings: new DrizzleSettingsRepository(db),
      clock: systemClock,
      random: { next: () => randomInt(0, 1_000_000) / 1_000_000 },
    }),
  };
}

export function cronAuthorized(request: Request): boolean | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export const paymentsEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
