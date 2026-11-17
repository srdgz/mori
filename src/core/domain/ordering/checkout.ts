import { add, includedTax, subtract, type Money } from "../shared/money";

export type Totals = Readonly<{ subtotal: Money; discount: Money; deliveryFee: Money; total: Money; vat: Money }>;

export function checkoutTotals(input: { subtotal: Money; discount: Money; deliveryFee: Money; vatRateBasisPoints: number }): Totals {
  const total = add(subtract(input.subtotal, input.discount), input.deliveryFee);
  return {
    subtotal: input.subtotal,
    discount: input.discount,
    deliveryFee: input.deliveryFee,
    total,
    vat: includedTax(total, input.vatRateBasisPoints),
  };
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function pickupCode(random: () => number): string {
  const chars = Array.from({ length: 4 }, () => ALPHABET[Math.floor(random() * ALPHABET.length) % ALPHABET.length]);
  return `MR-${chars.join("")}`;
}

export function isPickupCode(value: string): boolean {
  return new RegExp(`^MR-[${ALPHABET}]{4}$`).test(value);
}
