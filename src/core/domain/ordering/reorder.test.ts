import { describe, expect, it } from "vitest";
import { group, option, product } from "@/test/catalog";
import { reorderLines, type PastLine } from "./reorder";

const regular = option("regular");
const large = option("large");
const oat = option("oat", { isAvailable: false });
const classic = product({ slug: "classic", optionGroups: [group("size", [regular, large]), group("milk", [oat], { required: false })] });
const retired = product({ slug: "retired", isAvailable: false });

const past = (productId: string, options: PastLine["options"], quantity = 1): PastLine => ({
  productId,
  productName: productId,
  options,
  quantity,
});

describe("reorderLines", () => {
  it("rebuilds the lines with today's option ids", () => {
    const result = reorderLines(
      [past("classic", [{ group: "size", code: "large" }], 2), past("classic", [{ group: "size", code: "large" }])],
      [classic],
    );
    expect(result).toEqual({ lines: [{ productId: "classic", optionIds: ["opt-large"], quantity: 3 }], skipped: [] });
  });

  it("skips drinks that are gone, unavailable or whose options changed", () => {
    const result = reorderLines(
      [
        past("missing", []),
        past("retired", []),
        past("classic", [{ group: "size", code: "huge" }]),
        past("classic", [{ group: "colour", code: "green" }]),
        past("classic", [
          { group: "size", code: "regular" },
          { group: "milk", code: "oat" },
        ]),
        past("classic", [{ group: "size", code: "regular" }]),
      ],
      [classic, retired],
    );
    expect(result.lines).toEqual([{ productId: "classic", optionIds: ["opt-regular"], quantity: 1 }]);
    expect(result.skipped).toEqual(["missing", "retired", "classic"]);
  });

  it("stops adding once the cart is full", () => {
    const menu = Array.from({ length: 21 }, (_, i) => product({ slug: `p${i}` }));
    const result = reorderLines(
      menu.map((p) => past(p.id, [])),
      menu,
    );
    expect(result.lines).toHaveLength(20);
    expect(result.skipped).toEqual(["p20"]);
  });

  it("lets unexpected errors through", () => {
    const broken = Object.defineProperty({ ...product({ slug: "broken" }) }, "isAvailable", {
      get: () => {
        throw new Error("boom");
      },
    });
    expect(() => reorderLines([past("broken", [])], [broken])).toThrow("boom");
  });
});
