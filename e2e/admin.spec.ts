import { randomInt } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { orderStatus, placePaidOrder, setRole } from "./orders-db";
import { signUpNew, uniqueEmail } from "./outbox";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

function boardDay(): string {
  const date = new Date(Date.UTC(2032, 0, 1 + randomInt(0, 700)));
  return date.toISOString().slice(0, 10);
}

async function signInAs(page: Page, role: "staff" | "admin", name: string) {
  const email = uniqueEmail(name);
  await signUpNew(page, email);
  await setRole(email, role);
  return email;
}

function card(page: Page, code: string) {
  return page.getByRole("article", { name: new RegExp(code) });
}

test("a paid order goes from new to completed on the board while the customer watches", async ({ page, browser }) => {
  const day = boardDay();
  const order = await placePaidOrder({ email: uniqueEmail("flow"), slotStart: new Date(`${day}T10:00:00Z`), notes: "sin hielo" });

  const customer = await browser.newPage();
  await customer.emulateMedia({ reducedMotion: "reduce" });
  await customer.goto(`/pedido/${order.code}?t=${order.token}`);
  const heading = customer.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText("¡Pedido confirmado!");

  await signInAs(page, "staff", "barista");
  await page.goto(`/admin/pedidos?day=${day}`);
  const newColumn = page.getByRole("region", { name: /Nuevos/ });
  await expect(newColumn.getByRole("article", { name: new RegExp(order.code) })).toContainText("sin hielo");

  await card(page, order.code).getByRole("button", { name: "Preparar →" }).click();
  await expect(page.getByRole("region", { name: /En preparación/ }).getByRole("article", { name: new RegExp(order.code) })).toBeVisible();
  await expect(heading).toHaveText("Estamos preparando tu pedido", { timeout: 20_000 });

  await card(page, order.code).getByRole("button", { name: "Listo →" }).click();
  await expect(page.getByRole("region", { name: /Listos/ }).getByRole("article", { name: new RegExp(order.code) })).toBeVisible();
  await expect(heading).toHaveText("¡Tu pedido está listo!", { timeout: 20_000 });

  await card(page, order.code).getByRole("button", { name: "Completado →" }).click();
  await expect(page.getByRole("region", { name: /Completados/ }).getByRole("article", { name: new RegExp(order.code) })).toBeVisible();
  await expect(heading).toHaveText("¡Que lo disfrutes!", { timeout: 20_000 });
  expect(await orderStatus(order.code)).toBe("completed");
  await customer.close();
});

test("marking a drink as sold out shows on the menu right away", async ({ page }) => {
  await signInAs(page, "admin", "jefa");
  await page.goto("/admin/productos");
  const toggle = page.getByRole("switch", { name: "Dirty Matcha disponible" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await page.waitForTimeout(500);

  await page.goto("/carta/dirty-matcha");
  await expect(page.getByText("Agotada hoy").first()).toBeVisible();

  await page.goto("/admin/productos");
  await page.getByRole("switch", { name: "Dirty Matcha disponible" }).click();
  await expect(page.getByRole("switch", { name: "Dirty Matcha disponible" })).toHaveAttribute("aria-checked", "true");
  await page.waitForTimeout(500);
  await page.goto("/carta/dirty-matcha");
  await expect(page.getByText("Agotada hoy")).toHaveCount(0);
});

test("the demo staff moves example orders only and can't edit the shop", async ({ page }) => {
  const day = boardDay();
  const real = await placePaidOrder({ email: uniqueEmail("real"), slotStart: new Date(`${day}T09:00:00Z`) });
  const example = await placePaidOrder({ email: uniqueEmail("demo"), slotStart: new Date(`${day}T09:15:00Z`), isDemo: true });

  await page.goto("/cuenta/entrar");
  await page.getByRole("button", { name: "Ver el panel de tienda (demo)" }).click();
  await expect(page).toHaveURL(/\/admin\/pedidos$/);
  await expect(page.getByRole("region", { name: "Panel en modo demo" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Secciones del panel" })).toContainText("Solo para administración");

  await page.goto(`/admin/pedidos?day=${day}`);
  await expect(card(page, real.code)).toContainText("Pedido real: solo lectura en la demo");
  await expect(card(page, real.code).getByRole("button")).toHaveCount(0);
  await card(page, example.code).getByRole("button", { name: "Preparar →" }).click();
  await expect(page.getByRole("region", { name: /En preparación/ }).getByRole("article", { name: new RegExp(example.code) })).toBeVisible();

  await page.goto("/admin/productos");
  await expect(page).toHaveURL(/\/admin\/pedidos$/);
  await page.goto("/admin/ajustes");
  await expect(page).toHaveURL(/\/admin\/pedidos$/);
});

test("the staff cancels a new order from its page", async ({ page }) => {
  const day = boardDay();
  const order = await placePaidOrder({ email: uniqueEmail("cancel"), slotStart: new Date(`${day}T11:00:00Z`), isDemo: true });
  await signInAs(page, "staff", "cancel-staff");
  await page.goto(`/admin/pedidos/${order.code}`);
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Cancelar y reembolsar" }).click();
  await expect(page.getByText("Cancelado", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar y reembolsar" })).toHaveCount(0);
  expect(await orderStatus(order.code)).toBe("cancelled");
});

test("customers and visitors can't open the panel", async ({ page }) => {
  await page.goto("/admin/pedidos");
  await expect(page).toHaveURL(/\/cuenta\/entrar\?next=%2Fadmin%2Fpedidos$/);
  await signUpNew(page, uniqueEmail("nosy"));
  await page.goto("/admin/pedidos");
  await expect(page).toHaveURL(/\/cuenta$/);
});

test("scheduled jobs need the secret", async ({ request }) => {
  expect((await request.post("/api/cron/expire-orders")).status()).toBe(401);
  expect((await request.post("/api/cron/demo-orders", { headers: { Authorization: "Bearer nope" } })).status()).toBe(401);
  const expire = await request.post("/api/cron/expire-orders", { headers: { Authorization: "Bearer e2e-cron-secret" } });
  expect(expire.status()).toBe(200);
  expect(await expire.json()).toHaveProperty("expired");
  const demo = await request.post("/api/cron/demo-orders", { headers: { Authorization: "Bearer e2e-cron-secret" } });
  expect(demo.status()).toBe(200);
  expect(await demo.json()).toHaveProperty("advanced");
});

test("the panel has no WCAG 2.2 AA violations", async ({ page }) => {
  await signInAs(page, "admin", "axe-admin");
  for (const path of [
    "/admin",
    "/admin/pedidos",
    "/admin/productos",
    "/admin/productos/10000000-0000-4000-8000-000000000001",
    "/admin/cupones",
    "/admin/clientes",
    "/admin/ajustes",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("load");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  }
});
