import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("the contact form explains every error and then confirms the message", async ({ page }) => {
  await page.goto("/contacto");
  const form = page.locator("form");
  await form.getByRole("button", { name: "Enviar mensaje" }).click();

  await expect(form.getByLabel("Nombre *")).toBeFocused();
  await expect(form.getByLabel("Nombre *")).toHaveAttribute("aria-invalid", "true");
  await expect(form.locator("#email-error")).toHaveText("Este campo es obligatorio.");
  await expect(form.locator("#consent-error")).toHaveText("Necesitamos tu consentimiento para responderte.");
  await expect(form.getByRole("status")).toHaveText("Revisa 4 campo(s) del formulario.");

  await form.getByLabel("Nombre *").fill("Lucía");
  await form.getByLabel("Email *").fill("lucia@example");
  await form.getByLabel("Email *").blur();
  await expect(form.locator("#email-error")).toHaveText("Introduce un email válido, por ejemplo nombre@dominio.com.");

  await form.getByLabel("Email *").fill("lucia@example.com");
  await form.getByLabel("Mensaje *").fill("¿Hacéis catering para eventos de empresa?");
  await form.getByLabel(/Acepto que MŌRI/).check();
  await form.getByRole("radio", { name: "Eventos y catering" }).check({ force: true });
  await form.getByRole("button", { name: "Enviar mensaje" }).click();

  await expect(page.getByRole("heading", { name: "¡Mensaje recibido!" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "¡Mensaje recibido!" })).toBeFocused();

  await page.getByRole("button", { name: "Enviar otro mensaje" }).click();
  await expect(form.getByLabel("Nombre *")).toHaveValue("");
  await expect(form.getByLabel("Nombre *")).toBeFocused();
});
