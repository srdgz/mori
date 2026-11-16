import { describe, expect, it } from "vitest";
import { canStaffMove, canTransition, isFinal, ORDER_STATUSES } from "./order-status";

describe("canTransition", () => {
  it("follows the pickup flow", () => {
    expect(canTransition("pending_payment", "received", "pickup")).toBe(true);
    expect(canTransition("received", "preparing", "pickup")).toBe(true);
    expect(canTransition("preparing", "ready", "pickup")).toBe(true);
    expect(canTransition("ready", "completed", "pickup")).toBe(true);
  });

  it("follows the delivery flow", () => {
    expect(canTransition("preparing", "out_for_delivery", "delivery")).toBe(true);
    expect(canTransition("out_for_delivery", "completed", "delivery")).toBe(true);
  });

  it("keeps ready for pickups and out for delivery for deliveries", () => {
    expect(canTransition("preparing", "ready", "delivery")).toBe(false);
    expect(canTransition("preparing", "out_for_delivery", "pickup")).toBe(false);
  });

  it("does not skip steps", () => {
    expect(canTransition("pending_payment", "completed", "pickup")).toBe(false);
    expect(canTransition("received", "ready", "pickup")).toBe(false);
  });

  it("only cancels before preparation starts", () => {
    expect(canTransition("received", "cancelled", "pickup")).toBe(true);
    expect(canTransition("preparing", "cancelled", "pickup")).toBe(false);
  });

  it("accepts a late payment on an expired order", () => {
    expect(canTransition("expired", "received", "pickup")).toBe(true);
  });
});

describe("canStaffMove", () => {
  it("allows the kitchen steps", () => {
    expect(canStaffMove("received", "preparing", "pickup")).toBe(true);
  });

  it("leaves payment and expiry to the system", () => {
    expect(canStaffMove("pending_payment", "received", "pickup")).toBe(false);
    expect(canStaffMove("pending_payment", "expired", "pickup")).toBe(false);
  });
});

describe("isFinal", () => {
  it("marks the end states", () => {
    expect(ORDER_STATUSES.filter(isFinal)).toEqual(["completed", "cancelled", "refunded"]);
  });
});
