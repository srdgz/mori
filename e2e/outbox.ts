import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, type Page } from "@playwright/test";

export const outbox = resolve(".e2e", "outbox.jsonl");

type Email = { kind: string; to: string; url?: string; locale: string };

async function emails(): Promise<Email[]> {
  const content = await readFile(outbox, "utf8").catch(() => "");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Email);
}

export async function lastEmail(to: string, kind: string): Promise<Email> {
  let found: Email | undefined;
  await expect
    .poll(
      async () => {
        found = (await emails()).filter((e) => e.to === to && e.kind === kind).at(-1);
        return Boolean(found);
      },
      { timeout: 10_000 },
    )
    .toBe(true);
  return found!;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function asNewClient(page: Page): Promise<void> {
  const octet = () => Math.floor(Math.random() * 250) + 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}` });
}

export async function signUpAndVerify(page: Page, email: string, password = "matcha-mood-2026", name = "Ana López"): Promise<void> {
  await asNewClient(page);
  await page.goto("/cuenta/registro");
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByLabel(/acepto la política de privacidad/i).check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu email" })).toBeVisible();
  const verification = await lastEmail(email, "verify_email");
  await page.goto(verification.url!);
  await expect(page).toHaveURL(/\/cuenta$/);
}
