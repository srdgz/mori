import { money, type Money } from "../shared/money";

export type Coupon = Readonly<{
  code: string;
  kind: "percent" | "amount";
  value: number;
  minSubtotal: Money;
  firstOrderOnly: boolean;
  maxUses: number | null;
  perCustomerLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
}>;

export type CouponContext = Readonly<{ subtotal: Money; now: Date; totalUses: number; customerUses: number; isFirstOrder: boolean }>;

export type CouponError = "inactive" | "not_started" | "expired" | "minimum" | "first_order" | "used_up" | "already_used";

export type CouponResult = Readonly<{ ok: true; discount: Money }> | Readonly<{ ok: false; error: CouponError; minimum?: Money }>;

export function normaliseCode(code: string): string {
  return code.trim().toUpperCase();
}

export function applyCoupon(coupon: Coupon, context: CouponContext): CouponResult {
  if (!coupon.isActive) return { ok: false, error: "inactive" };
  if (coupon.startsAt && context.now < coupon.startsAt) return { ok: false, error: "not_started" };
  if (coupon.endsAt && context.now > coupon.endsAt) return { ok: false, error: "expired" };
  if (coupon.maxUses !== null && context.totalUses >= coupon.maxUses) return { ok: false, error: "used_up" };
  if (coupon.perCustomerLimit !== null && context.customerUses >= coupon.perCustomerLimit) return { ok: false, error: "already_used" };
  if (coupon.firstOrderOnly && !context.isFirstOrder) return { ok: false, error: "first_order" };
  if (context.subtotal.cents < coupon.minSubtotal.cents) return { ok: false, error: "minimum", minimum: coupon.minSubtotal };

  const raw = coupon.kind === "percent" ? Math.round((context.subtotal.cents * coupon.value) / 100) : coupon.value;
  return { ok: true, discount: money(Math.min(raw, context.subtotal.cents)) };
}

export type CouponField = "code" | "value" | "maxUses" | "perCustomerLimit" | "dates";

export function couponErrors(coupon: Coupon): CouponField[] {
  const errors: CouponField[] = [];
  if (!/^[A-Z0-9]{3,20}$/.test(normaliseCode(coupon.code))) errors.push("code");
  const maxValue = coupon.kind === "percent" ? 100 : 5000;
  if (!Number.isInteger(coupon.value) || coupon.value < 1 || coupon.value > maxValue) errors.push("value");
  if (coupon.maxUses !== null && (!Number.isInteger(coupon.maxUses) || coupon.maxUses < 1)) errors.push("maxUses");
  if (coupon.perCustomerLimit !== null && (!Number.isInteger(coupon.perCustomerLimit) || coupon.perCustomerLimit < 1))
    errors.push("perCustomerLimit");
  if (coupon.startsAt && coupon.endsAt && coupon.endsAt <= coupon.startsAt) errors.push("dates");
  return errors;
}
