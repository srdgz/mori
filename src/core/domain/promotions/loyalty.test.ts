import { describe, expect, it } from "vitest";
import { group, option, product } from "@/test/catalog";
import { lineKey, priceCart, type CartLine } from "../cart/cart";
import type { OptionId } from "../catalog/options";
import type { ProductId } from "../catalog/product";
import { money } from "../shared/money";
import { loyaltyCard, redeemFreeDrink } from "./loyalty";

const regular = option("regular", { sort: 1 });
const large = option("large", { sort: 2, priceDelta: money(90) });
const classic = product({ slug: "classic", price: money(450), optionGroups: [group("size", [regular, large])] });
const dirty = product({ slug: "dirty", price: money(560), optionGroups: [group("size", [regular, large])] });

function line(productId: string, optionIds: string[], quantity = 1): CartLine {
  return { productId: productId as ProductId, optionIds: optionIds as OptionId[], quantity };
}

describe("loyaltyCard", () => {
  it("fills the stamps up to the goal and says how many are missing", () => {
    expect(loyaltyCard(5, 8)).toEqual({ stamps: 5, required: 8, filled: 5, missing: 3, canRedeem: false });
    expect(loyaltyCard(11, 8)).toEqual({ stamps: 11, required: 8, filled: 8, missing: 0, canRedeem: true });
  });

  it("never shows a negative or partial balance", () => {
    expect(loyaltyCard(-2, 8)).toMatchObject({ stamps: 0, filled: 0, missing: 8 });
    expect(loyaltyCard(3.7, 8)).toMatchObject({ stamps: 3 });
  });
});

describe("redeemFreeDrink", () => {
  const cart = priceCart([line(classic.id, [regular.id], 2), line(dirty.id, [large.id])], [classic, dirty]);

  it("takes one unit of the chosen drink off, extras included", () => {
    const key = lineKey(line(dirty.id, [large.id]));
    expect(redeemFreeDrink(loyaltyCard(8, 8), cart, key)).toEqual({ ok: true, redemption: { line: key, discount: money(650) } });
    const classicKey = lineKey(line(classic.id, [regular.id]));
    expect(redeemFreeDrink(loyaltyCard(9, 8), cart, classicKey)).toEqual({
      ok: true,
      redemption: { line: classicKey, discount: money(450) },
    });
  });

  it("needs a full card and a drink that is in the order", () => {
    expect(redeemFreeDrink(loyaltyCard(7, 8), cart, lineKey(line(dirty.id, [large.id])))).toEqual({
      ok: false,
      error: "not_enough_stamps",
    });
    expect(redeemFreeDrink(loyaltyCard(8, 8), cart, "nope")).toEqual({ ok: false, error: "line_not_found" });
  });
});
