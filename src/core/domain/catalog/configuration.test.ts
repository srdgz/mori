import { describe, expect, it } from "vitest";
import { group, option, product } from "@/test/catalog";
import { money } from "../shared/money";
import { configureDrink, defaultSelection, lineTotal } from "./configuration";
import type { OptionId } from "./options";

const regular = option("regular", { sort: 1 });
const large = option("large", { sort: 2, priceDelta: money(90) });
const whole = option("whole", { sort: 1 });
const oat = option("oat", { sort: 2, priceDelta: money(40) });
const shot = option("shot", { sort: 1, priceDelta: money(100) });
const foam = option("foam", { sort: 2, priceDelta: money(80) });

const drink = product({
  slug: "classic",
  price: money(450),
  optionGroups: [
    group("extras", [foam, shot], { selection: "multiple", required: false, sort: 3 }),
    group("size", [large, regular], { sort: 1, defaultOptionId: regular.id }),
    group("milk", [oat, whole], { sort: 2 }),
  ],
});

describe("defaultSelection", () => {
  it("picks each group's default, or the first available option of a required group", () => {
    expect(defaultSelection(drink)).toEqual([regular.id, whole.id]);
  });

  it("skips a default that is sold out", () => {
    const soldOut = product({
      slug: "x",
      optionGroups: [group("size", [option("regular", { sort: 1, isAvailable: false }), large], { defaultOptionId: regular.id })],
    });
    expect(defaultSelection(soldOut)).toEqual([large.id]);
  });

  it("leaves a required group empty when nothing in it is available", () => {
    const empty = product({ slug: "x", optionGroups: [group("size", [option("regular", { isAvailable: false })])] });
    expect(defaultSelection(empty)).toEqual([]);
  });
});

describe("configureDrink", () => {
  it("adds the price of every chosen option to the base price", () => {
    const configured = configureDrink(drink, [large.id, oat.id, shot.id, foam.id]);
    expect(configured.unitPrice).toEqual(money(450 + 90 + 40 + 100 + 80));
  });

  it("returns the choices grouped and in menu order, without empty optional groups", () => {
    const configured = configureDrink(drink, [whole.id, regular.id]);
    expect(configured.choices.map((c) => [c.group.code, c.options.map((o) => o.code)])).toEqual([
      ["size", ["regular"]],
      ["milk", ["whole"]],
    ]);
  });

  it("keeps several options of a multiple group in their menu order", () => {
    const configured = configureDrink(drink, [regular.id, whole.id, foam.id, shot.id]);
    expect(configured.choices[2]?.options.map((o) => o.code)).toEqual(["shot", "foam"]);
  });

  it("rejects an unavailable product", () => {
    expect(() => configureDrink({ ...drink, isAvailable: false }, defaultSelection(drink))).toThrow(
      expect.objectContaining({ code: "catalog.product_unavailable" }),
    );
  });

  it("rejects the same option twice", () => {
    expect(() => configureDrink(drink, [regular.id, regular.id, whole.id])).toThrow(
      expect.objectContaining({ code: "catalog.option_duplicated" }),
    );
  });

  it("rejects an option the product does not offer", () => {
    expect(() => configureDrink(drink, [regular.id, whole.id, "opt-gold" as OptionId])).toThrow(
      expect.objectContaining({ code: "catalog.option_not_offered" }),
    );
  });

  it("rejects a sold-out option", () => {
    const soldOutOat = product({ ...drink, optionGroups: [group("milk", [whole, { ...oat, isAvailable: false }])] });
    expect(() => configureDrink(soldOutOat, [oat.id])).toThrow(expect.objectContaining({ code: "catalog.option_unavailable" }));
  });

  it("rejects a missing required choice", () => {
    expect(() => configureDrink(drink, [regular.id])).toThrow(expect.objectContaining({ code: "catalog.option_required" }));
  });

  it("rejects two choices in a single-choice group", () => {
    expect(() => configureDrink(drink, [regular.id, large.id, whole.id])).toThrow(
      expect.objectContaining({ code: "catalog.option_single" }),
    );
  });
});

describe("lineTotal", () => {
  const configured = configureDrink(drink, [large.id, whole.id]);

  it("multiplies the unit price by the quantity", () => {
    expect(lineTotal(configured, 3)).toEqual(money(540 * 3));
  });

  it.each([0, 21, 1.5])("rejects a quantity of %s", (quantity) => {
    expect(() => lineTotal(configured, quantity)).toThrow(expect.objectContaining({ code: "catalog.invalid_quantity" }));
  });
});
