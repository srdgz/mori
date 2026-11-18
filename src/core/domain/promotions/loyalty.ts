import { lineKey, type PricedCart } from "../cart/cart";
import type { Money } from "../shared/money";

export type LoyaltyCard = Readonly<{
  stamps: number;
  required: number;
  filled: number;
  missing: number;
  canRedeem: boolean;
}>;

export function loyaltyCard(stamps: number, required: number): LoyaltyCard {
  const balance = Math.max(0, Math.floor(stamps));
  const filled = Math.min(balance, required);
  return { stamps: balance, required, filled, missing: required - filled, canRedeem: balance >= required };
}

export type Redemption = Readonly<{ line: string; discount: Money }>;

export type RedemptionResult =
  Readonly<{ ok: true; redemption: Redemption }> | Readonly<{ ok: false; error: "not_enough_stamps" | "line_not_found" }>;

export function redeemFreeDrink(card: LoyaltyCard, cart: PricedCart, line: string): RedemptionResult {
  if (!card.canRedeem) return { ok: false, error: "not_enough_stamps" };
  const priced = cart.lines.find((l) => lineKey(l.line) === line);
  if (!priced) return { ok: false, error: "line_not_found" };
  return { ok: true, redemption: { line, discount: priced.drink.unitPrice } };
}
