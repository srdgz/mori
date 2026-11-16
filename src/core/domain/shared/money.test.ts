import { describe, expect, it } from "vitest";
import { add, formatMoney, includedTax, money, multiply, percentage, subtract, ZERO } from "./money";

describe("money", () => {
  it("accepts whole positive cents and zero", () => {
    expect(money(450)).toEqual({ cents: 450 });
    expect(ZERO).toEqual({ cents: 0 });
  });

  it("rejects fractional cents", () => {
    expect(() => money(4.5)).toThrowError(expect.objectContaining({ code: "money.not_integer" }));
  });

  it("rejects negative amounts", () => {
    expect(() => money(-1)).toThrowError(expect.objectContaining({ code: "money.negative" }));
  });

  it("adds any number of amounts", () => {
    expect(add(money(450), money(90), money(40))).toEqual(money(580));
    expect(add()).toEqual(ZERO);
  });

  it("multiplies by whole quantities only", () => {
    expect(multiply(money(540), 3)).toEqual(money(1620));
    expect(() => multiply(money(540), 1.5)).toThrowError(expect.objectContaining({ code: "money.invalid_factor" }));
    expect(() => multiply(money(540), -1)).toThrowError(expect.objectContaining({ code: "money.invalid_factor" }));
  });

  it("never subtracts below zero", () => {
    expect(subtract(money(1000), money(250))).toEqual(money(750));
    expect(subtract(money(200), money(250))).toEqual(ZERO);
  });

  it("takes a percentage expressed in basis points and rounds to the nearest cent", () => {
    expect(percentage(money(1595), 1000)).toEqual(money(160));
    expect(percentage(money(1000), 1000)).toEqual(money(100));
  });

  it("extracts the VAT included in a gross price", () => {
    expect(includedTax(money(1100), 1000)).toEqual(money(100));
    expect(includedTax(money(450), 1000)).toEqual(money(41));
  });

  it("formats euros in each locale", () => {
    expect(formatMoney(money(450), "es")).toBe("4,50 €");
    expect(formatMoney(money(450), "en")).toBe("€4.50");
    expect(formatMoney(money(123456), "es")).toBe("1234,56 €");
  });
});
