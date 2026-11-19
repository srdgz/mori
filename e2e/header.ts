import { expect, type Page } from "@playwright/test";

/**
 * The language switch sits in the header on desktop, but inside the mobile menu
 * on small screens. Open the menu first when the burger is on screen.
 */
export async function openLanguageSwitch(page: Page) {
  const burger = page.getByRole("button", { name: "Abrir menú" }).or(page.getByRole("button", { name: "Open menu" }));
  if (!(await burger.isVisible())) return;
  await burger.click();
  await expect(page.locator("#mobile-menu")).toBeVisible();
}
