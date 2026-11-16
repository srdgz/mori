"use server";

import { headers } from "next/headers";
import { redirect as nextRedirect } from "next/navigation";
import { z } from "zod";
import { account } from "@/composition/container";
import type { FormResult } from "@/core/application/account/session";
import type { AddressId } from "@/core/domain/account/address";
import { DomainError } from "@/core/domain/shared/domain-error";
import { getPathname, redirect } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import type { FormState } from "@/ui/account/form-state";

const text = (max = 200) => z.string().max(max).default("");
const flag = z.literal("on").optional();

function localeOf(formData: FormData): AppLocale {
  const value = formData.get("locale");
  return routing.locales.find((l) => l === value) ?? routing.defaultLocale;
}

async function clientKey(): Promise<string> {
  const all = await headers();
  return all.get("x-forwarded-for")?.split(",")[0]?.trim() || all.get("x-real-ip") || "local";
}

function safeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

function values(formData: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}

function fromResult(result: FormResult, kept: Record<string, string> = {}): FormState {
  if (result.status === "ok") return { status: "ok", at: Date.now() };
  if (result.status === "invalid")
    return { status: "error", fields: result.errors as Record<string, string>, values: kept, at: Date.now() };
  return { status: "error", code: result.reason, values: kept, at: Date.now() };
}

async function guarded(run: () => Promise<FormState>, kept: Record<string, string> = {}): Promise<FormState> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof DomainError && error.code === "auth.required")
      return { status: "error", code: "auth_required", values: kept, at: Date.now() };
    if (error instanceof DomainError && error.code === "access.denied")
      return { status: "error", code: "denied", values: kept, at: Date.now() };
    throw error;
  }
}

export async function signInAction(_state: FormState, formData: FormData): Promise<FormState> {
  const locale = localeOf(formData);
  const parsed = z.object({ email: text(), password: text(128) }).safeParse(Object.fromEntries(formData));
  const kept = values(formData, ["email"]);
  if (!parsed.success) return { status: "error", code: "invalid_credentials", values: kept, at: Date.now() };
  const next = safeNext(formData.get("next")) ?? getPathname({ locale, href: "/account" });
  const outcome = await account().signIn(parsed.data.email, parsed.data.password, next, await clientKey());
  if (outcome !== "signed_in") return { status: "error", code: outcome, values: kept, at: Date.now() };
  nextRedirect(next);
}

export async function googleSignInAction(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const next = safeNext(formData.get("next")) ?? getPathname({ locale, href: "/account" });
  const url = await account().identity.socialSignInUrl("google", next);
  nextRedirect(url);
}

export async function signUpAction(_state: FormState, formData: FormData): Promise<FormState> {
  const locale = localeOf(formData);
  const parsed = z
    .object({ name: text(120), email: text(), password: text(200), privacy: flag, marketing: flag })
    .safeParse(Object.fromEntries(formData));
  const kept = values(formData, ["name", "email"]);
  if (!parsed.success) return { status: "error", code: "generic", values: kept, at: Date.now() };
  const result = await account().signUp(
    { ...parsed.data, locale, privacy: parsed.data.privacy === "on", marketing: parsed.data.marketing === "on" },
    getPathname({ locale, href: "/account" }),
    await clientKey(),
  );
  return { ...fromResult(result, kept), values: kept };
}

export async function forgotPasswordAction(_state: FormState, formData: FormData): Promise<FormState> {
  const locale = localeOf(formData);
  const parsed = z.object({ email: text() }).safeParse(Object.fromEntries(formData));
  const kept = values(formData, ["email"]);
  if (!parsed.success) return { status: "error", fields: { email: "invalid" }, values: kept, at: Date.now() };
  const result = await account().requestPasswordReset(
    parsed.data.email,
    getPathname({ locale, href: "/account/reset-password" }),
    await clientKey(),
  );
  return fromResult(result, kept);
}

export async function resetPasswordAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ token: text(500), password: text(200), confirmation: text(200) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", code: "invalid_token", at: Date.now() };
  return fromResult(await account().resetPassword(parsed.data.token, parsed.data.password, parsed.data.confirmation));
}

export async function signOutAction(formData: FormData): Promise<void> {
  await account().identity.signOut();
  redirect({ href: "/", locale: localeOf(formData) });
}

export async function updateProfileAction(_state: FormState, formData: FormData): Promise<FormState> {
  const kept = values(formData, ["name", "phone"]);
  const parsed = z
    .object({ name: text(120), phone: text(40), emailLocale: text(5), marketing: flag })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", code: "generic", values: kept, at: Date.now() };
  const { name, phone, emailLocale, marketing } = parsed.data;
  return guarded(
    async () => fromResult(await account().updateProfile({ name, phone, locale: emailLocale, marketing: marketing === "on" }), kept),
    kept,
  );
}

export async function changePasswordAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ current: text(200), password: text(200), confirmation: text(200) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", code: "generic", at: Date.now() };
  const { current, password, confirmation } = parsed.data;
  return guarded(async () => fromResult(await account().changePassword(current, password, confirmation)));
}

export async function deleteAccountAction(_state: FormState, formData: FormData): Promise<FormState> {
  const locale = localeOf(formData);
  const parsed = z.object({ word: text(20), password: text(200) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", code: "generic", at: Date.now() };
  const state = await guarded(async () => fromResult(await account().deleteAccount(parsed.data.word, parsed.data.password)));
  if (state.fields?.confirmation) state.fields = { word: state.fields.confirmation };
  if (state.status === "ok") redirect({ href: "/", locale });
  return state;
}

const addressFields = ["label", "line1", "line2", "postalCode", "city", "instructions"];

export async function saveAddressAction(_state: FormState, formData: FormData): Promise<FormState> {
  const kept = values(formData, addressFields);
  const parsed = z
    .object({
      id: text(64),
      label: text(80),
      line1: text(200),
      line2: text(200),
      postalCode: text(10),
      city: text(80),
      instructions: text(300),
      isDefault: flag,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", code: "generic", values: kept, at: Date.now() };
  const { id, isDefault, ...input } = parsed.data;
  return guarded(
    async () => fromResult(await account().saveAddress(id ? (id as AddressId) : null, { ...input, isDefault: isDefault === "on" }), kept),
    kept,
  );
}

export async function removeAddressAction(_state: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  return guarded(async () =>
    (await account().removeAddress(id as AddressId))
      ? { status: "ok", at: Date.now() }
      : { status: "error", code: "not_found", at: Date.now() },
  );
}

export type FavouriteState = { signedIn: boolean; favourite: boolean };

export async function favouriteStatusAction(slug: string): Promise<FavouriteState> {
  const { user } = await account().currentActor();
  if (!user) return { signedIn: false, favourite: false };
  const favourites = await account().listFavourites();
  return { signedIn: true, favourite: favourites.some((p) => p.slug === slug) };
}

export async function toggleFavouriteAction(slug: string): Promise<FavouriteState> {
  try {
    const outcome = await account().toggleFavourite(slug);
    return { signedIn: true, favourite: outcome === "added" };
  } catch (error) {
    if (error instanceof DomainError) return { signedIn: false, favourite: false };
    throw error;
  }
}
