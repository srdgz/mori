import { can, canHandleOrder, isStaff, type Actor, type UserId } from "@/core/domain/access/actor";
import { groupByColumn, nextStaffStep, type BoardColumn } from "@/core/domain/ordering/board";
import { canTransition, type OrderStatus } from "@/core/domain/ordering/order-status";
import { orderTimeline, type Timeline } from "@/core/domain/ordering/timeline";
import { money, subtract } from "@/core/domain/shared/money";
import { addDays, localDate, zonedInstant, type LocalDate } from "@/core/domain/shared/zoned-time";
import { currentActor } from "../checkout/tracking";
import type { Clock } from "../ports/clock";
import type { BoardCard, OrderRepository, OrderView, PaymentGateway } from "../ports/checkout";
import type { Identity } from "../ports/identity";
import type { LiveQuerySealer, SealedQuery } from "../ports/live";

export type Board = Readonly<{
  day: LocalDate;
  now: Date;
  columns: Record<BoardColumn, BoardCard[]>;
  version: string;
  canAdvance: (card: Pick<BoardCard, "isDemo">) => boolean;
}>;

export type StaffOrder = Readonly<{
  order: OrderView;
  timeline: Timeline;
  next: OrderStatus | null;
  canAdvance: boolean;
  canCancel: boolean;
  canRefund: boolean;
}>;

export type ManageResult = "done" | "forbidden" | "not_found" | "invalid_transition";

function staffId(actor: Actor): UserId | null {
  return actor.kind === "guest" ? null : actor.id;
}

export function boardTag(day: LocalDate, version: string): string {
  let hash = 5381;
  for (const char of `${day}|${version}`) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  return `${day}.${hash.toString(36)}`;
}

export function boardVersion(cards: readonly Pick<BoardCard, "code" | "status">[]): string {
  return cards.map((c) => `${c.code}:${c.status}`).join("|");
}

export function makeGetBoard(deps: { orders: OrderRepository; identity: Identity; clock: Clock; timeZone: string }) {
  return async (day: LocalDate | null = null): Promise<Board | null> => {
    const actor = await currentActor(deps.identity);
    if (!isStaff(actor)) return null;
    const now = deps.clock.now();
    const date = day ?? localDate(now, deps.timeZone);
    const cards = await deps.orders.board(zonedInstant(date, 0, deps.timeZone), zonedInstant(addDays(date, 1), 0, deps.timeZone));
    return {
      day: date,
      now,
      columns: groupByColumn(cards),
      version: boardVersion(cards),
      canAdvance: (card) => canHandleOrder(actor, "orders.advance", card),
    };
  };
}

export function makeGetStaffOrder(deps: { orders: OrderRepository; identity: Identity }) {
  return async (code: string): Promise<StaffOrder | null> => {
    const actor = await currentActor(deps.identity);
    if (!isStaff(actor)) return null;
    const order = await deps.orders.byCode(code.toUpperCase());
    if (!order) return null;
    const handles = canHandleOrder(actor, "orders.advance", order);
    return {
      order,
      timeline: orderTimeline(order.fulfilment, order.status, order.events),
      next: nextStaffStep(order.status, order.fulfilment),
      canAdvance: handles,
      canCancel: handles && canTransition(order.status, "cancelled", order.fulfilment),
      canRefund: canHandleOrder(actor, "orders.refund", order) && canTransition(order.status, "refunded", order.fulfilment),
    };
  };
}

async function refundAndClose(
  deps: { orders: OrderRepository; payments: PaymentGateway },
  order: OrderView,
  next: "cancelled" | "refunded",
  actorId: UserId | null,
): Promise<ManageResult> {
  const result = await deps.orders.advance(order.id, next, actorId);
  if (result !== "advanced") return result;
  const remaining = subtract(order.total, order.refunded);
  const charged = order.paymentIntentId !== null && !order.isDemo;
  if (charged && remaining.cents > 0) {
    await deps.payments.refund({ orderId: order.id, paymentIntentId: order.paymentIntentId!, amount: remaining });
  }
  await deps.orders.recordRefund(order.id, charged ? remaining : money(0));
  return "done";
}

export function makeCancelOrder(deps: { orders: OrderRepository; identity: Identity; payments: PaymentGateway }) {
  return async (code: string): Promise<ManageResult> => {
    const actor = await currentActor(deps.identity);
    if (!can(actor, "orders.advance")) return "forbidden";
    const order = await deps.orders.byCode(code.toUpperCase());
    if (!order) return "not_found";
    if (!canHandleOrder(actor, "orders.advance", order)) return "forbidden";
    if (!canTransition(order.status, "cancelled", order.fulfilment)) return "invalid_transition";
    return refundAndClose(deps, order, "cancelled", staffId(actor));
  };
}

export function makeRefundOrder(deps: { orders: OrderRepository; identity: Identity; payments: PaymentGateway }) {
  return async (code: string): Promise<ManageResult> => {
    const actor = await currentActor(deps.identity);
    if (!can(actor, "orders.refund")) return "forbidden";
    const order = await deps.orders.byCode(code.toUpperCase());
    if (!order) return "not_found";
    if (!canTransition(order.status, "refunded", order.fulfilment)) return "invalid_transition";
    return refundAndClose(deps, order, "refunded", staffId(actor));
  };
}

export function makeSealBoardQuery(deps: { identity: Identity; sealer: LiveQuerySealer | null; timeZone: string }) {
  return async (day: LocalDate): Promise<{ url: string; sealed: SealedQuery } | null> => {
    if (!deps.sealer || !isStaff(await currentActor(deps.identity))) return null;
    return {
      url: deps.sealer.url,
      sealed: await deps.sealer.sealBoard(zonedInstant(day, 0, deps.timeZone), zonedInstant(addDays(day, 1), 0, deps.timeZone)),
    };
  };
}
