import { describe, expect, it } from "vitest";
import { group, option, product } from "@/test/catalog";
import type { OptionId } from "../catalog/options";
import type { ProductId } from "../catalog/product";
import { DomainError } from "../shared/domain-error";
import { money } from "../shared/money";
import {
  addToCart,
  lineKey,
  MAX_LINES,
  mergeCarts,
  priceCart,
  rebaseCart,
  replaceOptions,
  setQuantity,
  type Cart,
  type CartLine,
} from "./cart";

const regular = option("regular", { sort: 1 });
const large = option("large", { sort: 2, priceDelta: money(90) });
const classic = product({ slug: "classic", price: money(450), optionGroups: [group("size", [regular, large])] });
const vanilla = product({ slug: "vanilla", price: money(520), optionGroups: [group("size", [regular, large])] });

function line(productId: string, optionIds: string[], quantity = 1): CartLine {
  return { productId: productId as ProductId, optionIds: optionIds as OptionId[], quantity };
}

describe("cart editing", () => {
  it("treats the same drink with the same options as one line, whatever the option order", () => {
    expect(lineKey(line("a", ["x", "y"]))).toBe(lineKey(line("a", ["y", "x"])));
    const cart = addToCart(addToCart([], line("classic", [regular.id])), line("classic", [regular.id], 2));
    expect(cart).toEqual([line("classic", [regular.id], 3)]);
  });

  it("adds to the matching line and leaves the others alone", () => {
    const cart: Cart = [line("classic", [regular.id]), line("vanilla", [regular.id])];
    expect(addToCart(cart, line("vanilla", [regular.id]))).toEqual([line("classic", [regular.id]), line("vanilla", [regular.id], 2)]);
  });

  it("keeps different options on separate lines", () => {
    const cart = addToCart(addToCart([], line("classic", [regular.id])), line("classic", [large.id]));
    expect(cart).toHaveLength(2);
  });

  it("caps quantities at 20 and drops lines set to zero", () => {
    let cart = addToCart([], line("classic", [regular.id], 19));
    cart = addToCart(cart, line("classic", [regular.id], 5));
    expect(cart[0]?.quantity).toBe(20);
    expect(setQuantity(cart, lineKey(cart[0]!), 0)).toEqual([]);
    expect(setQuantity(cart, lineKey(cart[0]!), 2.7)[0]?.quantity).toBe(2);
    const two: Cart = [...cart, line("vanilla", [])];
    expect(setQuantity(two, lineKey(two[1]!), 4)).toEqual([cart[0], line("vanilla", [], 4)]);
  });

  it("ignores an empty line", () => {
    expect(addToCart([], line("classic", [regular.id], 0))).toEqual([]);
  });

  it("refuses more than 20 different lines", () => {
    const full: Cart = Array.from({ length: MAX_LINES }, (_, i) => line(`p${i}`, []));
    expect(() => addToCart(full, line("extra", []))).toThrow(expect.objectContaining({ code: "cart.full" }));
  });

  it("changes a line's options, merging with an identical line", () => {
    const cart: Cart = [line("classic", [regular.id]), line("classic", [large.id], 2)];
    expect(replaceOptions(cart, lineKey(cart[0]!), [large.id])).toEqual([line("classic", [large.id], 3)]);
    expect(replaceOptions(cart, "missing", [large.id])).toBe(cart);
  });

  it("merges a saved cart into the current one", () => {
    const current: Cart = [line("classic", [regular.id], 1)];
    const saved: Cart = [line("classic", [regular.id], 2), line("vanilla", [regular.id])];
    expect(mergeCarts(current, saved)).toEqual([line("classic", [regular.id], 3), line("vanilla", [regular.id])]);
  });

  it("drops saved lines that no longer fit when merging", () => {
    const full: Cart = Array.from({ length: MAX_LINES }, (_, i) => line(`p${i}`, []));
    expect(mergeCarts(full, [line("extra", []), line("p0", [], 2)])[0]?.quantity).toBe(3);
  });

  it("takes the synced cart when nothing changed while it was syncing", () => {
    const sent: Cart = [line("classic", [regular.id])];
    const synced: Cart = [line("classic", [regular.id]), line("vanilla", [regular.id])];
    expect(rebaseCart(sent, sent, synced)).toBe(synced);
  });

  it("keeps edits made while syncing and adds only the account's own lines", () => {
    const sent: Cart = [line("classic", [regular.id])];
    const current: Cart = [line("classic", [regular.id], 2), line("coconut", [regular.id])];
    const synced: Cart = [line("classic", [regular.id], 3), line("vanilla", [regular.id])];
    expect(rebaseCart(sent, current, synced)).toEqual([
      line("classic", [regular.id], 2),
      line("coconut", [regular.id]),
      line("vanilla", [regular.id]),
    ]);
  });
});

describe("priceCart", () => {
  it("prices every line from the current menu and adds up the subtotal", () => {
    const priced = priceCart([line(classic.id, [large.id], 2), line(vanilla.id, [regular.id])], [classic, vanilla]);
    expect(priced.lines.map((l) => l.total.cents)).toEqual([1080, 520]);
    expect(priced.subtotal).toEqual(money(1600));
    expect(priced.items).toBe(3);
    expect(priced.issues).toEqual([]);
  });

  it("reports lines that can't be sold any more", () => {
    const soldOut = { ...vanilla, isAvailable: false };
    const cart = [line("gone", []), line(soldOut.id, [regular.id]), line(classic.id, ["opt-gold"]), line(classic.id, [regular.id])];
    const priced = priceCart(cart, [classic, soldOut]);
    expect(priced.issues.map((i) => i.reason)).toEqual(["not_found", "unavailable", "options_changed"]);
    expect(priced.subtotal).toEqual(money(450));
  });

  it("does not hide unexpected errors", () => {
    const broken = {
      ...classic,
      get optionGroups(): never {
        throw new DomainError("other.error", "x");
      },
    };
    expect(() => priceCart([line(classic.id, [])], [broken])).toThrow("x");
  });
});
