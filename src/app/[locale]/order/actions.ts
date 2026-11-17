"use server";

import { z } from "zod";
import { checkout } from "@/composition/checkout";
import type { Reorder } from "@/core/domain/ordering/reorder";
import { redirect } from "@/i18n/navigation";
import { locales, type AppLocale } from "@/i18n/routing";

const codeSchema = z.string().trim().max(12);
const tokenSchema = z.string().uuid();

export async function reorderAction(code: string, token: string | null): Promise<Reorder | null> {
  const parsedCode = codeSchema.safeParse(code);
  const parsedToken = token === null ? null : tokenSchema.safeParse(token);
  if (!parsedCode.success || (parsedToken && !parsedToken.success)) return null;
  return checkout().reorder(parsedCode.data, parsedToken?.data ?? null);
}

export async function claimOrderAction(formData: FormData): Promise<void> {
  const code = codeSchema.safeParse(formData.get("code"));
  const token = tokenSchema.safeParse(formData.get("token"));
  const requested = formData.get("locale");
  const locale: AppLocale = (locales as readonly unknown[]).includes(requested) ? (requested as AppLocale) : "es";
  if (!code.success || !token.success) return;
  const outcome = await checkout().claimOrder(code.data, token.data);
  if (outcome === "claimed") {
    redirect({ href: { pathname: "/account/orders/[code]", params: { code: code.data.toUpperCase() }, query: { saved: "1" } }, locale });
  }
}
