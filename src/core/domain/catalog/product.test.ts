import { describe, expect, it } from "vitest";
import { product } from "@/test/catalog";
import { relatedProducts } from "./product";

const menu = [1, 2, 3, 4, 5].map((sort) => product({ slug: `p${sort}`, sort }));

describe("relatedProducts", () => {
  it("suggests the drinks that follow on the menu", () => {
    expect(relatedProducts(menu[1]!, menu).map((p) => p.slug)).toEqual(["p3", "p4", "p5"]);
  });

  it("wraps around to the start of the menu", () => {
    expect(relatedProducts(menu[3]!, menu).map((p) => p.slug)).toEqual(["p5", "p1", "p2"]);
  });

  it("starts from the beginning after the last drink", () => {
    expect(relatedProducts(menu[4]!, menu, 2).map((p) => p.slug)).toEqual(["p1", "p2"]);
  });

  it("leaves out unavailable drinks", () => {
    const withSoldOut = menu.map((p) => (p.slug === "p3" ? { ...p, isAvailable: false } : p));
    expect(relatedProducts(withSoldOut[1]!, withSoldOut).map((p) => p.slug)).toEqual(["p4", "p5", "p1"]);
  });
});
