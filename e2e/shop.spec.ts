import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function addDrink(page: Page, slug: string, quantity = 1) {
  await page.goto(`/carta/${slug}`);
  for (let i = 1; i < quantity; i++) await page.getByRole("button", { name: "Añadir una" }).click();
  await page.getByRole("button", { name: /^Añadir ·/ }).click();
  await expect(page.getByRole("dialog", { name: "Tu pedido" })).toBeVisible();
}

async function expectNoAxeViolations(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(800);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .exclude("iframe")
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("adding a drink opens the cart with the right price and count", async ({ page }) => {
  await addDrink(page, "classic-matcha", 2);
  const drawer = page.getByRole("dialog", { name: "Tu pedido" });
  await expect(drawer).toContainText("Classic Matcha");
  await expect(drawer).toContainText("9,00 €");
  await expect(drawer).toContainText("Te faltan 16,00 € para el envío gratis a domicilio");
  await drawer.getByRole("button", { name: "Cerrar tu pedido" }).click();
  await expect(page.getByRole("button", { name: /Abrir tu pedido, 2 bebidas/ })).toBeVisible();
});

test("the cart keeps its lines across pages and lets you change them", async ({ page }) => {
  await addDrink(page, "vanilla-matcha");
  await page.keyboard.press("Escape");
  await page.goto("/carrito");
  await page.getByRole("button", { name: "Añadir una de Vanilla Matcha" }).click();
  await expect(page.getByRole("main")).toContainText("10,40 €");
  await page.getByRole("button", { name: "Quitar Vanilla Matcha" }).click();
  await expect(page.getByText("Tu pedido está vacío.").first()).toBeVisible();
});

test("checkout prices pickup, delivery and coupons on the server", async ({ page }) => {
  await addDrink(page, "classic-matcha", 3);
  await page.goto("/checkout");
  const summary = page.getByRole("complementary", { name: "Resumen" });
  await expect(summary).toContainText("13,50 €");
  await expect(summary).toContainText("Recogida en tienda");

  await summary.getByLabel("¿Tienes un cupón?").fill("bienvenida10");
  await summary.getByRole("button", { name: "Aplicar" }).click();
  await expect(summary.getByText("Cupón BIENVENIDA10 aplicado")).toBeVisible();
  await expect(summary).toContainText("−1,35 €");
  await expect(summary).toContainText("12,15 €");

  await page.getByRole("radio", { name: "Envío a domicilio" }).check();
  await page.getByLabel("Código postal").fill("28020");
  await page.getByLabel("Calle y número").fill("C/ Bravo Murillo 1");
  await expect(page.getByRole("alert").filter({ hasText: "Aún no llegamos" })).toBeVisible();
  await page.getByLabel("Código postal").fill("28004");
  await expect(summary).toContainText("2,50 €");
  await expect(summary).toContainText("14,65 €");
  await expect(summary).toContainText("Te faltan 11,50 € para el envío gratis a domicilio");
});

test("checkout explains coupons that don't apply", async ({ page }) => {
  await addDrink(page, "classic-matcha");
  await page.goto("/checkout");
  const summary = page.getByRole("complementary", { name: "Resumen" });
  await summary.getByLabel("¿Tienes un cupón?").fill("MATCHAMIGO");
  await summary.getByRole("button", { name: "Aplicar" }).click();
  await expect(summary.getByText("Este cupón es para pedidos desde 15,00 €.")).toBeVisible();
  await summary.getByRole("button", { name: "Quitar el cupón" }).click();
  await summary.getByLabel("¿Tienes un cupón?").fill("GRATIS");
  await summary.getByRole("button", { name: "Aplicar" }).click();
  await expect(summary.getByText("Ese cupón no existe o ya no está activo.")).toBeVisible();
});

test("signing in from checkout offers to continue as a guest", async ({ page }) => {
  await addDrink(page, "classic-matcha");
  await page.goto("/checkout");
  await page.getByRole("main").getByRole("link", { name: "Entrar", exact: true }).click();
  await page.getByRole("link", { name: "Continuar como invitado" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
});

test("delivery below the minimum isn't shown as free", async ({ page }) => {
  await addDrink(page, "classic-matcha");
  await page.goto("/checkout");
  const summary = page.getByRole("complementary", { name: "Resumen" });
  await page.getByRole("radio", { name: "Envío a domicilio" }).check();
  await expect(summary).toContainText("Por calcular");
  await page.getByLabel("Código postal").fill("28004");
  await page.getByLabel("Calle y número").fill("C/ Fuencarral 10");
  await expect(page.getByRole("alert").filter({ hasText: "para el pedido mínimo" })).toBeVisible();
  await expect(summary).toContainText("No disponible");
  await expect(summary).not.toContainText("Gratis");
});

test("an empty checkout sends you back to the menu", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByText("Tu pedido está vacío").first()).toBeVisible();
});

test("an unknown order shows a friendly message", async ({ page }) => {
  await page.goto("/pedido/MR-ZZZZ");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("No encontramos ese pedido");
});

test("the cart and checkout have no WCAG 2.2 AA violations", async ({ page }) => {
  await addDrink(page, "coconut-matcha");
  await expectNoAxeViolations(page);
  await page.keyboard.press("Escape");
  await page.goto("/carrito");
  await expectNoAxeViolations(page);
  await page.goto("/checkout");
  await expectNoAxeViolations(page);
});
