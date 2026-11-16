import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { locales, pages } from "./pages";

for (const locale of locales) {
  for (const page of pages) {
    test(`${locale} ${page.key} has no WCAG 2.2 AA violations`, async ({ page: browser }) => {
      await browser.emulateMedia({ reducedMotion: "reduce" });
      await browser.goto(page[locale]);
      await browser.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page: browser }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
}
