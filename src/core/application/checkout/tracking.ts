import { actorFor, can, canViewOrder, GUEST, type Actor, type UserId } from "@/core/domain/access/actor";
import type { OrderStatus } from "@/core/domain/ordering/order-status";
import { reorderLines, type Reorder } from "@/core/domain/ordering/reorder";
import { orderTimeline, type Timeline } from "@/core/domain/ordering/timeline";
import type { Locale } from "@/core/domain/shared/locale";
import type { CatalogRepository } from "../ports/catalog-repository";
import type { AdvanceResult, OrderRepository, OrderSummary, OrderView } from "../ports/checkout";
import type { Identity } from "../ports/identity";
import type { LiveQuerySealer, SealedQuery } from "../ports/live";
import type { Mailer } from "../ports/mailer";

export type OrderTracking = Readonly<{
  order: OrderView;
  timeline: Timeline;
  version: string;
  canClaim: boolean;
}>;

export type TrackingSnapshot = Readonly<{
  code: string;
  status: OrderStatus;
  version: string;
  live: boolean;
  ended: Timeline["ended"];
  steps: readonly Readonly<{ status: OrderStatus; state: "done" | "current" | "upcoming"; at: string | null }>[];
}>;

export function trackingSnapshot(tracking: OrderTracking): TrackingSnapshot {
  return {
    code: tracking.order.code,
    status: tracking.order.status,
    version: tracking.version,
    live: tracking.timeline.live,
    ended: tracking.timeline.ended,
    steps: tracking.timeline.steps.map((s) => ({ status: s.status, state: s.state, at: s.at?.toISOString() ?? null })),
  };
}

export type OrderHistory = Readonly<{ orders: readonly OrderSummary[]; next: Date | null }>;

export const HISTORY_PAGE = 10;

async function currentActor(identity: Identity): Promise<Actor> {
  const user = await identity.currentUser();
  return user ? actorFor(user) : GUEST;
}

export function trackingVersion(order: Pick<OrderView, "status" | "events">): string {
  return `${order.status}.${order.events.length}`;
}

export function makeTrackOrder(orders: OrderRepository, identity: Identity) {
  return async (code: string, trackingToken: string | null): Promise<OrderTracking | null> => {
    const order = await orders.byCode(code.toUpperCase());
    if (!order) return null;
    const actor = await currentActor(identity);
    if (!canViewOrder(actor, order, trackingToken ?? undefined)) return null;
    return {
      order,
      timeline: orderTimeline(order.fulfilment, order.status, order.events),
      version: trackingVersion(order),
      canClaim: actor.kind === "customer" && order.customerId === null && trackingToken === order.trackingToken,
    };
  };
}

export function makeListOrders(orders: OrderRepository, identity: Identity) {
  return async (before: Date | null): Promise<OrderHistory | null> => {
    const actor = await currentActor(identity);
    if (actor.kind === "guest") return null;
    const page = await orders.listByCustomer(actor.id, HISTORY_PAGE + 1, before);
    const visible = page.slice(0, HISTORY_PAGE);
    return { orders: visible, next: page.length > HISTORY_PAGE ? (visible.at(-1)?.createdAt ?? null) : null };
  };
}

export function makeClaimOrder(orders: OrderRepository, identity: Identity) {
  return async (code: string, trackingToken: string): Promise<"claimed" | "not_allowed"> => {
    const actor = await currentActor(identity);
    const order = await orders.byCode(code.toUpperCase());
    if (actor.kind !== "customer" || !order || order.customerId !== null || order.trackingToken !== trackingToken) return "not_allowed";
    return (await orders.assignCustomer(order.id, actor.id)) ? "claimed" : "not_allowed";
  };
}

export function makeReorder(deps: { orders: OrderRepository; catalog: CatalogRepository; identity: Identity }) {
  return async (code: string, trackingToken: string | null): Promise<Reorder | null> => {
    const order = await deps.orders.byCode(code.toUpperCase());
    if (!order) return null;
    const actor = await currentActor(deps.identity);
    if (!canViewOrder(actor, order, trackingToken ?? undefined)) return null;
    return reorderLines(order.lines, await deps.catalog.all());
  };
}

const NOTIFY: Partial<Record<OrderStatus, "order_ready" | "order_out_for_delivery">> = {
  ready: "order_ready",
  out_for_delivery: "order_out_for_delivery",
};

export function makeAdvanceOrderStatus(deps: {
  orders: OrderRepository;
  identity: Identity;
  mailer: Mailer;
  trackingUrl: (code: string, token: string, locale: Locale) => string;
}) {
  return async (code: string, next: OrderStatus): Promise<AdvanceResult | "forbidden"> => {
    const actor = await currentActor(deps.identity);
    if (!can(actor, "orders.advance")) return "forbidden";
    const order = await deps.orders.byCode(code.toUpperCase());
    if (!order) return "not_found";
    const result = await deps.orders.advance(order.id, next, actor.kind === "guest" ? null : (actor.id as UserId));
    const kind = NOTIFY[next];
    if (result === "advanced" && kind) {
      await deps.mailer.send({
        kind,
        to: order.contactEmail,
        name: order.contactName,
        locale: order.locale,
        code: order.code,
        url: deps.trackingUrl(order.code, order.trackingToken, order.locale),
      });
    }
    return result;
  };
}

export function makeSealOrderQuery(orders: OrderRepository, identity: Identity, sealer: LiveQuerySealer | null) {
  return async (code: string, trackingToken: string | null): Promise<{ url: string; sealed: SealedQuery } | null> => {
    if (!sealer) return null;
    const order = await orders.byCode(code.toUpperCase());
    if (!order) return null;
    if (!canViewOrder(await currentActor(identity), order, trackingToken ?? undefined)) return null;
    return { url: sealer.url, sealed: await sealer.sealOrder(order.id) };
  };
}
