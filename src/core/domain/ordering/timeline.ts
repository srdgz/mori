import type { FulfilmentKind, OrderStatus } from "./order-status";

export type OrderEvent = Readonly<{ status: OrderStatus; at: Date }>;

export type TimelineStep = Readonly<{
  status: OrderStatus;
  state: "done" | "current" | "upcoming";
  at: Date | null;
}>;

export type Timeline = Readonly<{
  steps: readonly TimelineStep[];
  ended: "cancelled" | "refunded" | "expired" | null;
  live: boolean;
}>;

const ENDINGS = ["cancelled", "refunded", "expired"] as const;

type Ending = (typeof ENDINGS)[number];

function isEnding(status: OrderStatus): status is Ending {
  return (ENDINGS as readonly OrderStatus[]).includes(status);
}

export function trackingSteps(fulfilment: FulfilmentKind): readonly OrderStatus[] {
  return ["received", "preparing", fulfilment === "pickup" ? "ready" : "out_for_delivery", "completed"];
}

export function orderTimeline(fulfilment: FulfilmentKind, status: OrderStatus, events: readonly OrderEvent[]): Timeline {
  const flow = trackingSteps(fulfilment);
  const reachedAt = new Map<OrderStatus, Date>();
  for (const event of [...events].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    if (!reachedAt.has(event.status)) reachedAt.set(event.status, event.at);
  }
  const ended = isEnding(status) ? status : null;
  const lastReached = flow.reduce((last, step, index) => (reachedAt.has(step) ? index : last), -1);
  const position = ended ? lastReached : flow.indexOf(status);
  const steps = flow.map((step, index) => ({
    status: step,
    state:
      index < position || (index === position && (ended !== null || step === "completed"))
        ? ("done" as const)
        : index === position
          ? ("current" as const)
          : ("upcoming" as const),
    at: index <= position ? (reachedAt.get(step) ?? null) : null,
  }));
  return { steps, ended, live: ended === null && status !== "completed" };
}
