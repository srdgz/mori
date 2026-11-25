import { describe, expect, it } from "vitest";
import { money } from "../shared/money";
import { checkoutTotals, isPickupCode, paymentMode, pickupCode } from "./checkout";

describe("paymentMode", () => {
  it("skips the card for free orders and refuses amounts the card network can't charge", () => {
    expect(paymentMode(money(0))).toBe("free");
    expect(paymentMode(money(1))).toBe("below_card_minimum");
    expect(paymentMode(money(49))).toBe("below_card_minimum");
    expect(paymentMode(money(50))).toBe("card");
  });
});

describe("checkoutTotals", () => {
  it("adds delivery, takes the discount off and shows the 10 % VAT included", () => {
    expect(checkoutTotals({ subtotal: money(1450), discount: money(145), deliveryFee: money(250), vatRateBasisPoints: 1000 })).toEqual({
      subtotal: money(1450),
      discount: money(145),
      deliveryFee: money(250),
      total: money(1555),
      vat: money(141),
    });
  });

  it("never goes below zero before delivery", () => {
    expect(checkoutTotals({ subtotal: money(150), discount: money(200), deliveryFee: money(0), vatRateBasisPoints: 1000 }).total).toEqual(
      money(0),
    );
  });
});

describe("pickupCode", () => {
  it("builds short codes without ambiguous characters", () => {
    const values = [0, 0.5, 0.99, 0.2];
    let i = 0;
    const code = pickupCode(() => values[i++ % values.length]!);
    expect(code).toBe("MR-AS9G");
    expect(isPickupCode(code)).toBe(true);
  });

  it("stays in range even if the random source returns 1", () => {
    expect(isPickupCode(pickupCode(() => 1))).toBe(true);
  });

  it("rejects codes with characters that are easy to confuse", () => {
    expect(isPickupCode("MR-O0I1")).toBe(false);
    expect(isPickupCode("mr-aq9g")).toBe(false);
  });
});
