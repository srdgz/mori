import { describe, expect, it } from "vitest";
import { group, option, product } from "@/test/catalog";
import { demoLines, demoStep } from "./demo";

describe("demoStep", () => {
  it("moves example orders along after a few minutes in each step", () => {
    expect(demoStep("received", "pickup", 3)).toBeNull();
    expect(demoStep("received", "pickup", 4)).toBe("preparing");
    expect(demoStep("preparing", "pickup", 8)).toBe("ready");
    expect(demoStep("preparing", "delivery", 9)).toBe("out_for_delivery");
    expect(demoStep("ready", "pickup", 12)).toBe("completed");
    expect(demoStep("out_for_delivery", "delivery", 14)).toBeNull();
    expect(demoStep("out_for_delivery", "delivery", 15)).toBe("completed");
    expect(demoStep("completed", "pickup", 999)).toBeNull();
  });
});

describe("demoLines", () => {
  const regular = option("regular");
  const classic = product({ slug: "classic", optionGroups: [group("size", [regular])] });
  const vanilla = product({ slug: "vanilla" });
  const soldOut = product({ slug: "sold-out", isAvailable: false });
  const broken = product({ slug: "broken", optionGroups: [group("size", [option("gone", { isAvailable: false })])] });

  it("picks one drink with its default options when the dice say so", () => {
    const values = [0.1, 0.0, 0.0];
    expect(demoLines([classic, vanilla, soldOut, broken], () => values.shift() ?? 0)).toEqual([
      { productId: "classic", optionIds: ["opt-regular"], quantity: 1 },
    ]);
  });

  it("can pick two drinks and merges repeats", () => {
    const values = [0.9, 0.0, 0.5, 0.0, 0.9];
    expect(demoLines([classic], () => values.shift() ?? 0)).toEqual([{ productId: "classic", optionIds: ["opt-regular"], quantity: 5 }]);
    const more = [0.9, 0.0, 0.0, 0.6, 0.0];
    expect(demoLines([classic, vanilla], () => more.shift() ?? 0).map((l) => l.productId)).toEqual(["classic", "vanilla"]);
  });

  it("returns nothing when no drink can be ordered", () => {
    expect(demoLines([soldOut, broken], () => 0)).toEqual([]);
  });
});
