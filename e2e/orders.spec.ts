import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { advanceOrder, placePaidOrder } from "./orders-db";
import { signUpNew, uniqueEmail } from "./outbox";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("a guest watches the order change without reloading", async ({ page }) => {
  const order = await placePaidOrder({ email: uniqueEmail("guest") });
  await page.goto(`/pedido/${order.code}?t=${order.token}`);
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText("¡Pedido confirmado!");
  const timeline = page.getByRole("list").filter({ hasText: "Listo para recoger" });
  await expect(timeline.locator("[aria-current=step]")).toHaveText(/Recibido/);

  await advanceOrder(order.id, "preparing");
  await expect(heading).toHaveText("Estamos preparando tu pedido", { timeout: 20_000 });
  await expect(timeline.locator("[aria-current=step]")).toHaveText(/En preparación/);

  await advanceOrder(order.id, "ready");
  await expect(heading).toHaveText("¡Tu pedido está listo!", { timeout: 20_000 });
  await expect(page.getByText(order.code, { exact: true })).toBeVisible();
});

test("the tracking endpoint needs the link and answers 304 when nothing changed", async ({ request }) => {
  const order = await placePaidOrder({ email: uniqueEmail("etag") });
  expect((await request.get(`/api/orders/${order.code}`)).status()).toBe(404);
  const first = await request.get(`/api/orders/${order.code}?t=${order.token}`);
  expect(first.status()).toBe(200);
  expect(await first.json()).toMatchObject({ code: order.code, status: "received", live: true });
  const etag = first.headers()["etag"]!;
  const again = await request.get(`/api/orders/${order.code}?t=${order.token}`, { headers: { "If-None-Match": etag } });
  expect(again.status()).toBe(304);
  await advanceOrder(order.id, "preparing");
  expect((await request.get(`/api/orders/${order.code}?t=${order.token}`, { headers: { "If-None-Match": etag } })).status()).toBe(200);
});

test("the live query endpoint only seals queries it knows for people who can see them", async ({ request }) => {
  const order = await placePaidOrder({ email: uniqueEmail("live") });
  expect((await request.post("/api/live/board", { data: {} })).status()).toBe(404);
  expect((await request.post("/api/live/order", { data: { code: order.code } })).status()).toBe(400);
  expect((await request.post("/api/live/order", { data: { code: order.code, token: null } })).status()).toBe(404);
});

test("a wrong link shows nothing about the order", async ({ page }) => {
  const order = await placePaidOrder({ email: uniqueEmail("wrong") });
  await page.goto(`/pedido/${order.code}?t=00000000-0000-4000-8000-000000000000`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("No encontramos ese pedido");
});

test("customers see their orders, open one and order it again", async ({ page }) => {
  const email = uniqueEmail("hist");
  await signUpNew(page, email);
  const order = await placePaidOrder({ email, customerEmail: email, quantity: 2 });

  await page.goto("/cuenta");
  await expect(page.getByRole("region", { name: "Tu último pedido" })).toContainText(order.code);

  await page.goto("/cuenta/pedidos");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tus pedidos");
  const card = page.getByRole("article", { name: order.code });
  await expect(card).toContainText("Recibido");
  await expect(card).toContainText("2 bebidas");
  await card.getByRole("link", { name: "Seguir pedido" }).click();
  await expect(page).toHaveURL(new RegExp(`/cuenta/pedidos/${order.code}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("¡Pedido confirmado!");

  await page.getByRole("button", { name: "Repetir pedido" }).click();
  const drawer = page.getByRole("dialog", { name: "Tu pedido" });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("Classic Matcha");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Abrir tu pedido, 2 bebidas/ })).toBeVisible();
});

test("a signed-in customer saves a guest order with its link", async ({ page }) => {
  const email = uniqueEmail("claim");
  const order = await placePaidOrder({ email });
  await signUpNew(page, email);
  await page.goto(`/pedido/${order.code}?t=${order.token}`);
  await page.getByRole("button", { name: "Guardar en mi cuenta" }).click();
  await expect(page).toHaveURL(new RegExp(`/cuenta/pedidos/${order.code}\\?saved=1$`));
  await expect(page.getByText("Guardado en tu cuenta.")).toBeVisible();
  await page.goto("/cuenta/pedidos");
  await expect(page.getByRole("article", { name: order.code })).toBeVisible();
});

test("order pages stay private and accessible", async ({ page }) => {
  await page.goto("/cuenta/pedidos/MR-ABCD");
  await expect(page).toHaveURL(/\/cuenta\/entrar\?next=%2Fcuenta%2Fpedidos%2FMR-ABCD$/);

  const email = uniqueEmail("axe");
  await signUpNew(page, email);
  const order = await placePaidOrder({ email, customerEmail: email });
  for (const path of ["/cuenta/pedidos", `/cuenta/pedidos/${order.code}`]) {
    await page.goto(path);
    await page.waitForLoadState("load");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  }
});
