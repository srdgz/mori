import { expect, test } from "@playwright/test";
import { locales, pages } from "./pages";

for (const locale of locales) {
  for (const page of pages) {
    test(`${locale} ${page.key} renders with its heading, language and canonical`, async ({ page: browser }) => {
      const response = await browser.goto(page[locale]);
      expect(response?.status()).toBe(200);
      await expect(browser.locator("html")).toHaveAttribute("lang", locale);
      await expect(browser.getByRole("heading", { level: 1 })).toHaveText(page.h1[locale]);
      await expect(browser.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${page[locale].replace(/\/$/, "")}$`));
      await expect(browser.locator('link[rel="alternate"][hreflang="es"]')).toHaveCount(1);
      await expect(browser.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    });
  }
}

test("the language switch keeps the visitor on the same page", async ({ page }) => {
  await page.goto("/historia");
  await page.getByRole("group", { name: "Idioma" }).getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/story$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/our story/i);
  await page.getByRole("group", { name: "Language" }).getByRole("link", { name: "Español" }).click();
  await expect(page).toHaveURL(/\/historia$/);
});

test("unknown routes answer 404 with a way home", async ({ page }) => {
  const response = await page.goto("/no-existe");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("404 · Página no encontrada — MŌRI Matcha Bar & Culture");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("404");
  await page.getByRole("link", { name: "Volver al inicio" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("prefetching settles instead of looping", async ({ page }) => {
  const rsc: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("_rsc=")) rsc.push(new URL(request.url()).pathname);
  });
  await page.goto("/");
  await page.waitForTimeout(3000);
  const settled = rsc.length;
  await page.waitForTimeout(3000);
  expect(rsc.length).toBe(settled);
});

test.describe("desktop navigation", () => {
  test.skip(({ isMobile }) => isMobile, "desktop only");

  test("main navigation moves between pages without a full reload", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => ((window as unknown as { __marker: boolean }).__marker = true));
    await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "La carta" }).click();
    await expect(page).toHaveURL(/\/carta$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/la carta/i);
    expect(await page.evaluate(() => (window as unknown as { __marker?: boolean }).__marker)).toBe(true);
    await expect(page.getByRole("link", { name: "La carta" }).first()).toHaveAttribute("aria-current", "page");
  });
});

test.describe("mobile menu", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile only");

  test("opens, traps the page behind it and closes with Escape", async ({ page }) => {
    await page.goto("/");
    const burger = page.getByRole("button", { name: "Abrir menú" });
    await burger.click();
    await expect(page.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("main")).toHaveJSProperty("inert", true);
    await expect(page.locator("#mobile-menu").getByRole("link", { name: "Inicio" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Abrir menú" })).toBeFocused();
    await expect(page.locator("main")).toHaveJSProperty("inert", false);
  });

  test("navigates to a page from the menu", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.locator("#mobile-menu").getByRole("link", { name: "Dónde estamos" }).click();
    await expect(page).toHaveURL(/\/donde-estamos$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/dónde estamos/i);
  });
});
