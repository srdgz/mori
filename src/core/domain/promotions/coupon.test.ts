import { describe, expect, it } from "vitest";
import { money } from "../shared/money";
import { applyCoupon, couponErrors, normaliseCode, type Coupon, type CouponContext } from "./coupon";

const welcome: Coupon = {
  code: "BIENVENIDA10",
  kind: "percent",
  value: 10,
  minSubtotal: money(0),
  firstOrderOnly: true,
  maxUses: null,
  perCustomerLimit: 1,
  startsAt: null,
  endsAt: null,
  isActive: true,
};
const friend: Coupon = {
  ...welcome,
  code: "MATCHAMIGO",
  kind: "amount",
  value: 200,
  minSubtotal: money(1500),
  firstOrderOnly: false,
  perCustomerLimit: null,
};
const now = new Date("2026-11-20T10:00:00Z");
const context: CouponContext = { subtotal: money(1450), now, totalUses: 0, customerUses: 0, isFirstOrder: true };

describe("applyCoupon", () => {
  it("takes 10 % off, rounded to the cent", () => {
    expect(applyCoupon(welcome, context)).toEqual({ ok: true, discount: money(145) });
    expect(applyCoupon(welcome, { ...context, subtotal: money(1455) })).toEqual({ ok: true, discount: money(146) });
  });

  it("takes a fixed amount off from the minimum", () => {
    expect(applyCoupon(friend, { ...context, subtotal: money(1500) })).toEqual({ ok: true, discount: money(200) });
    expect(applyCoupon(friend, context)).toEqual({ ok: false, error: "minimum", minimum: money(1500) });
  });

  it("never discounts more than the subtotal", () => {
    expect(applyCoupon({ ...friend, minSubtotal: money(0) }, { ...context, subtotal: money(150) })).toEqual({
      ok: true,
      discount: money(150),
    });
  });

  it("checks that the coupon is active and in date", () => {
    expect(applyCoupon({ ...welcome, isActive: false }, context)).toEqual({ ok: false, error: "inactive" });
    expect(applyCoupon({ ...welcome, startsAt: new Date("2026-12-01") }, context)).toEqual({ ok: false, error: "not_started" });
    expect(applyCoupon({ ...welcome, endsAt: new Date("2026-11-01") }, context)).toEqual({ ok: false, error: "expired" });
    expect(applyCoupon({ ...welcome, startsAt: new Date("2026-11-01"), endsAt: new Date("2026-12-01") }, context)).toMatchObject({
      ok: true,
    });
  });

  it("respects the usage limits and first-order rule", () => {
    expect(applyCoupon({ ...welcome, maxUses: 5 }, { ...context, totalUses: 5 })).toEqual({ ok: false, error: "used_up" });
    expect(applyCoupon(welcome, { ...context, customerUses: 1 })).toEqual({ ok: false, error: "already_used" });
    expect(applyCoupon(welcome, { ...context, isFirstOrder: false })).toEqual({ ok: false, error: "first_order" });
  });

  it("normalises what the customer types", () => {
    expect(normaliseCode("  matchamigo ")).toBe("MATCHAMIGO");
  });
});

describe("couponErrors", () => {
  const valid: Coupon = {
    code: "verano25",
    kind: "percent",
    value: 25,
    minSubtotal: money(1000),
    firstOrderOnly: false,
    maxUses: 100,
    perCustomerLimit: 1,
    startsAt: new Date("2030-06-01T00:00:00Z"),
    endsAt: new Date("2030-09-01T00:00:00Z"),
    isActive: true,
  };

  it("accepts a well-formed coupon", () => {
    expect(couponErrors(valid)).toEqual([]);
    expect(couponErrors({ ...valid, kind: "amount", value: 200, maxUses: null, perCustomerLimit: null, startsAt: null })).toEqual([]);
  });

  it("points at every wrong field", () => {
    expect(
      couponErrors({
        ...valid,
        code: "x!",
        value: 120,
        maxUses: 0,
        perCustomerLimit: 0,
        endsAt: new Date("2030-05-01T00:00:00Z"),
      }),
    ).toEqual(["code", "value", "maxUses", "perCustomerLimit", "dates"]);
    expect(couponErrors({ ...valid, kind: "amount", value: 6000 })).toEqual(["value"]);
    expect(couponErrors({ ...valid, value: 2.5 })).toEqual(["value"]);
  });
});
