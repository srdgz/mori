import { expect, test } from "@playwright/test";
import { openLanguageSwitch } from "./header";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("each drink on the menu opens its own page", async ({ page }) => {
  await page.goto("/carta");
  await page.getByRole("link", { name: "Dirty Matcha" }).click();
  await expect(page).toHaveURL(/\/carta\/dirty-matcha$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/dirty matcha/i);
  await page.getByRole("navigation", { name: "Estás aquí" }).getByRole("link", { name: "La carta" }).click();
  await expect(page).toHaveURL(/\/carta$/);
});

test("the configurator prices every choice", async ({ page }) => {
  await page.goto("/carta/classic-matcha");
  const add = page.getByRole("button", { name: /^Añadir ·/ });
  await expect(add).toHaveText("Añadir · 4,50 €");

  await page.getByRole("radio", { name: /Grande/ }).check();
  await page.getByRole("radio", { name: /Avena/ }).check();
  await page.getByRole("checkbox", { name: /Shot extra de matcha/ }).check();
  await expect(add).toHaveText("Añadir · 6,80 €");

  await page.getByRole("button", { name: "Añadir una" }).click();
  await expect(add).toHaveText("Añadir · 13,60 €");
  await expect(page.getByText("6,80 € la unidad")).toBeVisible();

  await page.getByRole("checkbox", { name: /Shot extra de matcha/ }).uncheck();
  await expect(add).toHaveText("Añadir · 11,60 €");
});

test("required choices stay single and the keyboard can drive them", async ({ page }) => {
  await page.goto("/carta/vanilla-matcha");
  const size = page.getByRole("group", { name: "Tamaño" });
  await size.getByRole("radio", { name: /Normal/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(size.getByRole("radio", { name: /Grande/ })).toBeChecked();
  await expect(size.getByRole("radio", { name: /Normal/ })).not.toBeChecked();
});

test("iced-only drinks only offer iced", async ({ page }) => {
  await page.goto("/en/menu/iced-mango-matcha");
  const temperature = page.getByRole("group", { name: "Temperature" });
  await expect(temperature.getByRole("radio")).toHaveCount(1);
  await expect(temperature.getByRole("radio", { name: "Iced" })).toBeChecked();
});

test("adding puts the drink in the order", async ({ page }) => {
  await page.goto("/en/menu/classic-matcha");
  await page.getByRole("button", { name: /^Add ·/ }).click();
  const drawer = page.getByRole("dialog", { name: "Your order" });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("Classic Matcha");
});

test("the language switch keeps the same drink", async ({ page }) => {
  await page.goto("/en/menu/coconut-matcha");
  await openLanguageSwitch(page);
  await page.getByRole("group", { name: "Language" }).getByRole("link", { name: "Español" }).click();
  await expect(page).toHaveURL(/\/carta\/coconut-matcha$/);
});

test("an unknown drink answers 404", async ({ page }) => {
  const response = await page.goto("/carta/hojicha-latte");
  expect(response?.status()).toBe(404);
});

test("drink pages are in the sitemap", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/carta/classic-matcha");
  expect(sitemap).toContain("/en/menu/iced-mango-matcha");
});
