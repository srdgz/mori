import type { FulfilmentKind, OrderStatus } from "./order-status";

export const BOARD_COLUMNS = ["new", "preparing", "ready", "done"] as const;

export type BoardColumn = (typeof BOARD_COLUMNS)[number];

const columnOf: Partial<Record<OrderStatus, BoardColumn>> = {
  received: "new",
  preparing: "preparing",
  ready: "ready",
  out_for_delivery: "ready",
  completed: "done",
};

export function boardColumn(status: OrderStatus): BoardColumn | null {
  return columnOf[status] ?? null;
}

export function groupByColumn<Card extends { status: OrderStatus }>(cards: readonly Card[]): Record<BoardColumn, Card[]> {
  const columns: Record<BoardColumn, Card[]> = { new: [], preparing: [], ready: [], done: [] };
  for (const card of cards) {
    const column = boardColumn(card.status);
    if (column) columns[column].push(card);
  }
  return columns;
}

export function nextStaffStep(status: OrderStatus, fulfilment: FulfilmentKind): OrderStatus | null {
  if (status === "received") return "preparing";
  if (status === "preparing") return fulfilment === "pickup" ? "ready" : "out_for_delivery";
  if (status === "ready" || status === "out_for_delivery") return "completed";
  return null;
}
