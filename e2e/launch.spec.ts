import { expect, test, type Locator, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

async function tabTo(page: Page, target: Locator, limit = 80) {
  for (let i = 0; i < limit; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("The element never received focus");
}

test("the footer links to every legal page and each one says the brand is fictional", async ({ page }) => {
  await page.goto("/");
  const legal = page.getByRole("navigation", { name: "Información legal" });
  for (const [link, heading] of [
    ["Aviso legal", "Aviso legal"],
    ["Privacidad", "Política de privacidad"],
    ["Cookies", "Política de cookies"],
    ["Condiciones de venta", "Condiciones de venta"],
  ] as const) {
    await legal.getByRole("link", { name: link }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.getByText("MŌRI es una marca ficticia creada para un proyecto de portfolio.")).toBeVisible();
  }
  await page.getByRole("navigation", { name: "En esta página" }).getByRole("link", { name: "Cancelación y reembolso" }).click();
  await expect(page).toHaveURL(/#s-4$/);
});

test("the sign-up form links to the privacy policy", async ({ page }) => {
  await page.goto("/cuenta/registro");
  const link = page.getByRole("link", { name: /política de privacidad/ });
  await expect(link).toHaveAttribute("href", "/privacidad");
});

test("a visitor reaches checkout with the keyboard alone", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "Keyboard navigation is a desktop journey");
  await page.goto("/carta/classic-matcha");
  await tabTo(page, page.getByRole("button", { name: /^Añadir ·/ }));
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog", { name: "Tu pedido" });
  await expect(drawer).toBeVisible();
  await tabTo(page, drawer.getByRole("link", { name: "Tramitar pedido" }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/checkout$/);

  await tabTo(page, page.getByLabel("Nombre"));
  await page.keyboard.type("Lucía Teclado");
  await tabTo(page, page.getByLabel("Email"));
  await page.keyboard.type("teclado@example.com");
  await tabTo(page, page.getByLabel("Teléfono"));
  await page.keyboard.type("600123123");
  await tabTo(page, page.getByRole("button", { name: "Copiar número de tarjeta" }));
  await expect(page.getByLabel("Nombre")).toHaveValue("Lucía Teclado");
  await expect(page.getByRole("complementary", { name: "Resumen" })).toContainText("4,50 €");
});

test("the site sends a content security policy", async ({ request }) => {
  const response = await request.get("/");
  const policy = response.headers()["content-security-policy"] ?? "";
  expect(policy).toContain("default-src 'self'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("https://js.stripe.com");
  expect(response.headers()["strict-transport-security"]).toContain("max-age=");
});
