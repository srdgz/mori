import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { asNewClient, lastEmail, sentTo, signUpNew, uniqueEmail } from "./outbox";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/cuenta/entrar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

async function signOut(page: Page) {
  await page.goto("/cuenta/seguridad");
  await page.getByRole("region", { name: "Cerrar sesión" }).getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function expectNoAxeViolations(page: Page) {
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await asNewClient(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("private pages send visitors to sign in and back", async ({ page }) => {
  await page.goto("/cuenta/perfil");
  await expect(page).toHaveURL(/\/cuenta\/entrar\?next=%2Fcuenta%2Fperfil$/);
  await page.goto("/en/account");
  await expect(page).toHaveURL(/\/en\/account\/sign-in\?next=%2Fen%2Faccount$/);
});

test("sign-up explains what is missing", async ({ page }) => {
  await page.goto("/cuenta/registro");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /revisa los 4 campos/i })).toBeVisible();
  await expect(page.getByLabel("Nombre")).toBeFocused();
  await expect(page.getByText("Escribe un email válido.")).toBeVisible();
  await expect(page.getByText("Necesitamos que aceptes la política de privacidad.")).toBeVisible();
});

test("a new customer signs up, confirms the email and manages the account", async ({ page }) => {
  const email = uniqueEmail("ana");
  await signUpNew(page, email);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/, Ana$/);

  await page.goto("/cuenta/perfil");
  await page.getByLabel("Teléfono").fill("call me");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText(/Escribe un teléfono válido/)).toBeVisible();
  await page.getByLabel("Teléfono").fill("+34 600 000 000");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Cambios guardados." })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Teléfono")).toHaveValue("+34 600 000 000");

  await page.goto("/cuenta/direcciones");
  await page.getByRole("button", { name: "Añadir dirección" }).click();
  await page.getByLabel("Nombre").fill("Casa");
  await page.getByLabel("Calle y número").fill("C/ del Pez 12");
  await page.getByLabel("Código postal").fill("28004");
  await page.getByRole("button", { name: "Guardar dirección" }).click();
  const card = page.getByRole("listitem").filter({ hasText: "Casa" });
  await expect(card).toContainText("C/ del Pez 12");
  await expect(card).toContainText("Predeterminada");

  await page.goto("/carta/classic-matcha");
  const save = page.getByRole("button", { name: "Guardar en favoritos" });
  await save.click();
  await expect(page.getByRole("button", { name: "Quitar de favoritos" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/cuenta/favoritos");
  await expect(page.getByRole("heading", { name: "Classic Matcha" })).toBeVisible();

  await signOut(page);
  await page.goto("/cuenta");
  await expect(page).toHaveURL(/\/cuenta\/entrar/);
});

test("sign-in rejects wrong details and returns to the requested page", async ({ page }) => {
  const email = uniqueEmail("eva");
  await signUpNew(page, email, "matcha-mood-2026", "Eva");
  await signOut(page);

  await signIn(page, email, "wrong-password");
  await expect(page.getByRole("alert").filter({ hasText: "Email o contraseña incorrectos." })).toBeVisible();

  await page.goto("/cuenta/direcciones");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("matcha-mood-2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta\/direcciones$/);
});

test("sign-up confirms the account and the customer signs in, with no email to confirm", async ({ page }) => {
  const email = uniqueEmail("leo");
  await signUpNew(page, email, "matcha-mood-2026", "Leo");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/, Leo$/);
  await expect(page.getByText(/confirma tu email/i)).toHaveCount(0);
  expect(await sentTo(email)).toEqual([]);
});

test("sign-up reports an email that already has an account", async ({ page }) => {
  const email = uniqueEmail("ivo");
  await signUpNew(page, email, "matcha-mood-2026", "Ivo");
  await signOut(page);
  await page.goto("/cuenta/registro");
  await page.getByLabel("Nombre").fill("Ivo");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("another-matcha-26");
  await page.getByLabel(/acepto la política de privacidad/i).check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Ya hay una cuenta con este email" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Recuperar contraseña" }).click();
  await expect(page).toHaveURL(/\/cuenta\/recuperar$/);
});

test("the demo account opens in one click and keeps its credentials", async ({ page }) => {
  await page.goto("/cuenta/entrar");
  await page.getByRole("button", { name: "Entrar en modo demo" }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/, Alex$/);
  await expect(page.getByRole("region", { name: "Cuenta de demostración" })).toBeVisible();
  await page.goto("/cuenta/seguridad");
  await expect(page.getByLabel("Contraseña actual")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Eliminar mi cuenta" })).toHaveCount(0);
});

test("a forgotten password is reset from the emailed link", async ({ page }) => {
  const email = uniqueEmail("mia");
  await signUpNew(page, email, "matcha-mood-2026", "Mía");
  await signOut(page);

  await page.goto("/cuenta/recuperar");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu email" })).toBeVisible();

  const reset = await lastEmail(email, "reset_password");
  await page.goto(reset.url!);
  await expect(page).toHaveURL(/\/cuenta\/nueva-contrasena\?token=/);
  await page.getByLabel("Contraseña nueva").fill("reset-matcha-2026");
  await page.getByLabel("Repite la contraseña").fill("reset-matcha-2026");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByRole("heading", { name: "Contraseña cambiada" })).toBeVisible();

  await signIn(page, email, "reset-matcha-2026");
  await expect(page).toHaveURL(/\/cuenta$/);
});

test("a customer deletes the account", async ({ page }) => {
  const email = uniqueEmail("noa");
  await signUpNew(page, email, "matcha-mood-2026", "Noa");

  await page.goto("/cuenta/seguridad");
  await page.getByLabel("Escribe ELIMINAR para confirmar").fill("BORRAR");
  await page.getByLabel("Tu contraseña").fill("matcha-mood-2026");
  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  await expect(page.getByText("Escribe la palabra exactamente como aparece, en mayúsculas.")).toBeVisible();

  await page.getByLabel("Escribe ELIMINAR para confirmar").fill("ELIMINAR");
  await page.getByLabel("Tu contraseña").fill("matcha-mood-2026");
  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  await expect(page).toHaveURL(/\/$/);

  await signIn(page, email, "matcha-mood-2026");
  await expect(page.getByRole("alert").filter({ hasText: "Email o contraseña incorrectos." })).toBeVisible();
});

test("a visitor is invited to sign in to save favourites", async ({ page }) => {
  await page.goto("/en/menu/vanilla-matcha");
  await page.getByRole("link", { name: "Sign in to save favourites" }).click();
  await expect(page).toHaveURL(/\/en\/account\/sign-in\?next=%2Fen%2Fmenu%2Fvanilla-matcha$/);
});

for (const path of ["/cuenta/entrar", "/cuenta/registro", "/cuenta/recuperar", "/en/account/sign-in", "/en/account/sign-up"]) {
  test(`${path} has no WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(path);
    await expectNoAxeViolations(page);
  });
}

test("account pages have no WCAG 2.2 AA violations", async ({ page }) => {
  await signUpNew(page, uniqueEmail("axe"), "matcha-mood-2026", "Axe");
  for (const path of ["/cuenta", "/cuenta/perfil", "/cuenta/direcciones", "/cuenta/favoritos", "/cuenta/seguridad"]) {
    await page.goto(path);
    await expectNoAxeViolations(page);
  }
});

test("passwords can be shown and hidden", async ({ page }) => {
  await page.goto("/cuenta/entrar");
  const password = page.getByLabel("Contraseña", { exact: true });
  await password.fill("matcha-mood-2026");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Mostrar contraseña" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "Ocultar contraseña" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Ocultar contraseña" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue("matcha-mood-2026");
});

test("the header shows the customer's initials once signed in", async ({ page }) => {
  const account = page.getByRole("banner").getByRole("link", { name: /tu cuenta/i });
  await page.goto("/");
  await expect(account).toHaveAccessibleName("Tu cuenta");
  await signUpNew(page, uniqueEmail("sara"), "matcha-mood-2026", "Sara Reyes Ruiz");
  await page.goto("/");
  await expect(account).toHaveAccessibleName("Tu cuenta: Sara Reyes Ruiz");
  await expect(account).toContainText("SR");
  await page.goto("/cuenta");
  await expect(page.getByRole("complementary")).toContainText("SR");
});

test("the auth API only exposes what the browser needs", async ({ request }) => {
  expect((await request.get("/api/auth/get-session")).status()).toBe(200);
  for (const path of [
    "/api/auth/sign-up/email",
    "/api/auth/change-password",
    "/api/auth/delete-user",
    "/api/auth/update-user",
    "/api/auth/sign-in/email",
  ]) {
    expect((await request.post(path, { data: {} })).status(), path).toBe(404);
  }
});

test("a signed-in cart keeps its quantities across languages and reloads", async ({ page }) => {
  await signUpNew(page, uniqueEmail("noa"));
  await page.goto("/carta/classic-matcha");
  await page.getByRole("button", { name: /^Añadir ·/ }).click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);
  for (const path of ["/en/menu/classic-matcha", "/en", "/carta/classic-matcha"]) {
    await page.goto(path);
    await page.waitForTimeout(800);
  }
  await page.reload();
  await page.waitForTimeout(800);
  await expect(page.getByRole("button", { name: /Abrir tu pedido, 1 bebida/ })).toBeVisible();
});
