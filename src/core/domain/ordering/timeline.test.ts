import { describe, expect, it } from "vitest";
import { orderTimeline, trackingSteps } from "./timeline";

const at = (minute: number) => new Date(Date.UTC(2026, 10, 17, 16, minute));

describe("trackingSteps", () => {
  it("ends pickups at the counter and deliveries at the door", () => {
    expect(trackingSteps("pickup")).toEqual(["received", "preparing", "ready", "completed"]);
    expect(trackingSteps("delivery")).toEqual(["received", "preparing", "out_for_delivery", "completed"]);
  });
});

describe("orderTimeline", () => {
  it("shows every step ahead while the payment is pending", () => {
    const timeline = orderTimeline("pickup", "pending_payment", [{ status: "pending_payment", at: at(0) }]);
    expect(timeline.steps.map((s) => s.state)).toEqual(["upcoming", "upcoming", "upcoming", "upcoming"]);
    expect(timeline.live).toBe(true);
    expect(timeline.ended).toBeNull();
  });

  it("marks the current step and dates the ones reached", () => {
    const timeline = orderTimeline("pickup", "preparing", [
      { status: "preparing", at: at(15) },
      { status: "received", at: at(2) },
    ]);
    expect(timeline.steps).toEqual([
      { status: "received", state: "done", at: at(2) },
      { status: "preparing", state: "current", at: at(15) },
      { status: "ready", state: "upcoming", at: null },
      { status: "completed", state: "upcoming", at: null },
    ]);
    expect(timeline.live).toBe(true);
  });

  it("keeps the first time a step was reached", () => {
    const timeline = orderTimeline("delivery", "out_for_delivery", [
      { status: "received", at: at(2) },
      { status: "received", at: at(9) },
    ]);
    expect(timeline.steps[0]?.at).toEqual(at(2));
    expect(timeline.steps[2]).toEqual({ status: "out_for_delivery", state: "current", at: null });
  });

  it("finishes every step and stops when completed", () => {
    const timeline = orderTimeline("pickup", "completed", [{ status: "completed", at: at(40) }]);
    expect(timeline.steps.map((s) => s.state)).toEqual(["done", "done", "done", "done"]);
    expect(timeline.steps[3]?.at).toEqual(at(40));
    expect(timeline.live).toBe(false);
  });

  it("stops at the last step reached when the order ends early", () => {
    const timeline = orderTimeline("pickup", "refunded", [
      { status: "received", at: at(2) },
      { status: "preparing", at: at(5) },
      { status: "refunded", at: at(9) },
    ]);
    expect(timeline.steps.map((s) => s.state)).toEqual(["done", "done", "upcoming", "upcoming"]);
    expect(timeline.ended).toBe("refunded");
    expect(timeline.live).toBe(false);
  });

  it("shows nothing reached for an order that expired unpaid", () => {
    const timeline = orderTimeline("delivery", "expired", [{ status: "expired", at: at(30) }]);
    expect(timeline.steps.every((s) => s.state === "upcoming" && s.at === null)).toBe(true);
    expect(timeline.ended).toBe("expired");
  });
});
