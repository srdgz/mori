import { describe, expect, it } from "vitest";
import { isLocale, localize } from "./locale";

describe("locale", () => {
  it("recognises the supported locales only", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });

  it("picks the text for a locale", () => {
    expect(localize({ es: "Vaso verde", en: "Green cup" }, "en")).toBe("Green cup");
  });
});
