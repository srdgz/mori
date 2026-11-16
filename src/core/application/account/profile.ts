import { validateNewPassword, validateProfile, type ProfileInput } from "@/core/domain/account/account";
import type { Identity } from "../ports/identity";
import type { Mailer } from "../ports/mailer";
import { requireUser, type FormResult } from "./session";

export const DELETE_CONFIRMATION = { es: "ELIMINAR", en: "DELETE" } as const;

export function makeUpdateProfile(identity: Identity) {
  return async (input: ProfileInput): Promise<FormResult<"name" | "phone" | "locale">> => {
    await requireUser(identity, "account.manage");
    const result = validateProfile(input);
    if (!result.ok) return { status: "invalid", errors: result.errors };
    await identity.updateProfile(result.value);
    return { status: "ok" };
  };
}

export function makeChangePassword(identity: Identity, mailer: Mailer) {
  return async (current: string, next: string, confirmation: string): Promise<FormResult<"current" | "password" | "confirmation">> => {
    const user = await requireUser(identity, "account.manage");
    const result = validateNewPassword(next, confirmation);
    if (!result.ok) return { status: "invalid", errors: result.errors };
    const outcome = await identity.changePassword(current, result.value);
    if (outcome === "invalid_password") return { status: "invalid", errors: { current: "wrong" } };
    await mailer.send({ kind: "password_changed", to: user.email, name: user.name, locale: user.locale });
    return { status: "ok" };
  };
}

export function makeDeleteAccount(identity: Identity) {
  return async (confirmation: string, password: string): Promise<FormResult<"confirmation" | "password">> => {
    const user = await requireUser(identity, "account.manage");
    const words: readonly string[] = Object.values(DELETE_CONFIRMATION);
    if (!words.includes(confirmation.trim())) return { status: "invalid", errors: { confirmation: "mismatch" } };
    const outcome = await identity.deleteAccount(user.hasPassword ? password : null);
    return outcome === "deleted" ? { status: "ok" } : { status: "invalid", errors: { password: "wrong" } };
  };
}
