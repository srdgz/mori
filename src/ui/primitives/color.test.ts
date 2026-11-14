import { describe, expect, it } from "vitest";
import { inkOn, relativeLuminance } from "./color";

describe("relativeLuminance", () => {
  it("is 0 for black and 1 for white", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1);
  });
});

describe("inkOn", () => {
  it("uses cream on dark cups and forest on light ones", () => {
    expect(inkOn("#6e4b36")).toBe("#E8E1D4");
    expect(inkOn("#b6d66b")).toBe("#183D2B");
    expect(inkOn("#f7f4ec")).toBe("#183D2B");
  });
});
