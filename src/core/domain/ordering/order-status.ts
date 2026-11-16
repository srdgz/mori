export const ORDER_STATUSES = [
  "pending_payment",
  "received",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
  "refunded",
  "expired",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const FULFILMENT_KINDS = ["pickup", "delivery"] as const;

export type FulfilmentKind = (typeof FULFILMENT_KINDS)[number];

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["received", "expired"],
  received: ["preparing", "cancelled", "refunded"],
  preparing: ["ready", "out_for_delivery", "refunded"],
  ready: ["completed", "refunded"],
  out_for_delivery: ["completed", "refunded"],
  completed: ["refunded"],
  cancelled: [],
  refunded: [],
  expired: ["received"],
};

const onlyFor: Partial<Record<OrderStatus, FulfilmentKind>> = { ready: "pickup", out_for_delivery: "delivery" };

const setByPayments: readonly OrderStatus[] = ["received", "expired"];

export function canTransition(from: OrderStatus, to: OrderStatus, fulfilment: FulfilmentKind): boolean {
  const required = onlyFor[to];
  return transitions[from].includes(to) && (required === undefined || required === fulfilment);
}

export function canStaffMove(from: OrderStatus, to: OrderStatus, fulfilment: FulfilmentKind): boolean {
  return !setByPayments.includes(to) && canTransition(from, to, fulfilment);
}

export function isFinal(status: OrderStatus): boolean {
  return transitions[status].length === 0 || status === "completed";
}
