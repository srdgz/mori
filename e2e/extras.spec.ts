import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { addStamps, advanceOrder, placePaidOrder, setRole } from "./orders-db";
import { signUpNew, uniqueEmail } from "./outbox";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

async function addDrink(page: Page, slug: string) {
  await page.goto(`/carta/${slug}`);
  await page.getByRole("button", { name: /^Añadir ·/ }).click();
  await expect(page.getByRole("dialog", { name: "Tu pedido" })).toBeVisible();
  await page.keyboard.press("Escape");
}

async function expectNoAxeViolations(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(600);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .exclude("iframe")
    .analyze();
  expect(results.violations.map((v) => `${page.url()} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test("a full MŌRI card gives the chosen drink for free at checkout", async ({ page }) => {
  const email = uniqueEmail("stamps");
  await signUpNew(page, email);
  await addStamps(email, 8);
  await page.goto("/cuenta");
  const card = page.getByRole("region", { name: "Tarjeta MŌRI" });
  await expect(card).toContainText("8 / 8");
  await expect(card).toContainText("Bebida gratis lista para canjear");
  await expect(card.getByRole("listitem", { name: "Sello 8: conseguido" })).toBeVisible();

  await addDrink(page, "classic-matcha");
  await addDrink(page, "dirty-matcha");
  await page.goto("/checkout");
  const summary = page.getByRole("complementary", { name: "Resumen" });
  await expect(summary).toContainText("10,10 €");
  await summary.getByRole("switch", { name: /Usar 8 sellos/ }).click();
  await expect(summary.getByRole("radio", { name: /Dirty Matcha/ })).toBeChecked();
  await expect(summary).toContainText("Tarjeta MŌRI");
  await expect(summary).toContainText("4,50 €");
  await summary.getByRole("radio", { name: /Classic Matcha/ }).check();
  await expect(summary.locator(".totals__total")).toContainText("5,60 €");
});

test("a free drink with nothing else to pay is confirmed without a card", async ({ page }) => {
  const email = uniqueEmail("free-order");
  await signUpNew(page, email);
  await addStamps(email, 8);
  await addDrink(page, "classic-matcha");
  await page.goto("/checkout");
  const summary = page.getByRole("complementary", { name: "Resumen" });
  await summary.getByRole("switch", { name: /Usar 8 sellos/ }).click();
  await expect(summary.locator(".totals__total")).toContainText("0,00 €");
  const thumb = await summary.locator(".switch__thumb").boundingBox();
  const toggle = await summary.getByRole("switch", { name: /Usar 8 sellos/ }).boundingBox();
  expect(thumb && toggle && thumb.y >= toggle.y && thumb.x >= toggle.x).toBe(true);
  await expect(page.getByText("Este pedido no tiene coste")).toBeVisible();
  await page.getByLabel("Teléfono").fill("600000000");
  await page.getByRole("button", { name: "Confirmar pedido" }).click();
  await expect(page).toHaveURL(/\/pedido\/MR-/);
  await expect(page.getByText("Recibido").first()).toBeVisible();
  await page.goto("/cuenta");
  await expect(page.getByRole("region", { name: "Tarjeta MŌRI" })).toContainText("0 / 8");
});

test("visitors are invited to collect stamps", async ({ page }) => {
  await addDrink(page, "classic-matcha");
  await page.goto("/checkout");
  await expect(page.getByRole("link", { name: "Entra para sumar sellos con este pedido" })).toBeVisible();
});

test("a customer reviews a drink they received", async ({ page }) => {
  const email = uniqueEmail("review");
  await signUpNew(page, email, undefined, "Lucía Martín");
  const order = await placePaidOrder({ email, customerEmail: email, slug: "coconut-matcha", quantity: 1 });
  await advanceOrder(order.id, "preparing");
  await page.goto(`/cuenta/pedidos/${order.code}`);
  await expect(page.getByText("Podrás valorar tus bebidas cuando recojas el pedido")).toBeVisible();
  for (const step of ["ready", "completed"]) await advanceOrder(order.id, step);

  await page.goto(`/cuenta/pedidos/${order.code}`);
  const form = page.getByRole("form", { name: "¿Qué tal tu Coconut Matcha?" });
  await form.locator("label").filter({ hasText: "5 estrellas" }).click();
  const text = `Fresquísimo ${Date.now()}`;
  await form.getByLabel(/Cuéntanos/).fill(text);
  await form.getByRole("button", { name: "Publicar reseña" }).click();
  await expect(form.getByRole("status")).toHaveText("¡Gracias! Tu reseña ya está publicada.");

  await expect
    .poll(async () => {
      await page.goto("/carta/coconut-matcha");
      return page.getByText(text).count();
    })
    .toBe(1);
  const review = page.getByRole("listitem").filter({ hasText: text });
  await expect(review).toContainText("Lucía M.");
  await expect(review).toContainText("Compra verificada");
});

test("the team hides a review from the panel", async ({ page }) => {
  const customer = uniqueEmail("hidden-review");
  const text = `Ocultable ${Date.now()}`;
  const writer = await page.context().browser()!.newPage();
  await signUpNew(writer, customer);
  const claimed = await placePaidOrder({ email: customer, customerEmail: customer, slug: "vanilla-matcha", quantity: 1 });
  for (const step of ["preparing", "ready", "completed"]) await advanceOrder(claimed.id, step);
  await writer.goto(`/cuenta/pedidos/${claimed.code}`);
  const form = writer.getByRole("form", { name: "¿Qué tal tu Vanilla Matcha?" });
  await form.locator("label").filter({ hasText: "2 estrellas" }).click();
  await form.getByLabel(/Cuéntanos/).fill(text);
  await form.getByRole("button", { name: "Publicar reseña" }).click();
  await expect(form.getByRole("status")).toHaveText("¡Gracias! Tu reseña ya está publicada.");
  await writer.close();

  const staff = uniqueEmail("moderator");
  await signUpNew(page, staff);
  await setRole(staff, "staff");
  await page.goto("/admin/resenas");
  const row = page.getByRole("listitem").filter({ hasText: text });
  await row.getByRole("switch").click();
  await expect(row).toContainText("Oculta");
  await expect
    .poll(async () => {
      await page.goto("/carta/vanilla-matcha");
      return page.getByText(text).count();
    })
    .toBe(0);
});

test("the site stays light when the system prefers dark and remains accessible", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  for (const path of ["/", "/carta", "/cultura-matcha", "/privacidad"]) {
    await page.goto(path);
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).toBe("rgb(243, 239, 231)");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
    await expectNoAxeViolations(page);
  }
});

test("the site can be installed and works offline", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  expect(await manifest.json()).toMatchObject({ short_name: "MŌRI", display: "standalone", start_url: "/" });
  expect((await request.get("/sw.js")).status()).toBe(200);
  expect((await request.get("/offline.html")).status()).toBe(200);
  expect((await request.get("/icons/maskable-512.png")).status()).toBe(200);
  const push = await request.post("/api/push", {
    data: { code: "MR-ABCD", token: null, subscription: { endpoint: "https://x", keys: {} } },
  });
  expect(push.status()).toBe(503);
});
