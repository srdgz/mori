import { describe, expect, it } from "vitest";
import { phoneHref } from "./store-info";

describe("phoneHref", () => {
  it("builds a tel: link without spaces", () => {
    expect(phoneHref("+34 910 000 000")).toBe("tel:+34910000000");
  });
});
