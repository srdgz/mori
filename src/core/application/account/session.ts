import { actorFor, authorize, GUEST, type Actor, type Permission } from "@/core/domain/access/actor";
import { isValidEmail, validateNewPassword, validateSignUp, type FieldErrors, type SignUpInput } from "@/core/domain/account/account";
import { DomainError } from "@/core/domain/shared/domain-error";
import type { Identity, SessionUser, SignInOutcome } from "../ports/identity";
import { RATE_RULES, type RateLimiter } from "../ports/rate-limiter";

export type FormResult<K extends string = string> =
  { status: "ok" } | { status: "invalid"; errors: FieldErrors<K> } | { status: "failed"; reason: string };

export async function currentActor(identity: Identity): Promise<{ actor: Actor; user: SessionUser | null }> {
  const user = await identity.currentUser();
  return { actor: user ? actorFor(user) : GUEST, user };
}

export async function requireUser(identity: Identity, permission: Permission): Promise<SessionUser> {
  const user = await identity.currentUser();
  if (!user) throw new DomainError("auth.required", "Sign in first");
  authorize(actorFor(user), permission);
  return user;
}

export function makeSignUp(identity: Identity, limiter: RateLimiter) {
  return async (
    input: SignUpInput,
    callbackPath: string,
    clientKey: string,
  ): Promise<FormResult<"name" | "email" | "password" | "privacy">> => {
    const result = validateSignUp(input);
    if (!result.ok) return { status: "invalid", errors: result.errors };
    if (!(await limiter.hit(`sign-up:${clientKey}`, RATE_RULES.signUp))) return { status: "failed", reason: "rate_limited" };
    const outcome = await identity.signUp(result.value, callbackPath);
    return outcome === "pending_verification" ? { status: "ok" } : { status: "failed", reason: outcome };
  };
}

export function makeSignIn(identity: Identity, limiter: RateLimiter) {
  return async (email: string, password: string, callbackPath: string, clientKey: string): Promise<SignInOutcome> => {
    if (!isValidEmail(email) || password.length === 0) return "invalid_credentials";
    const normalised = email.trim().toLowerCase();
    if (!(await limiter.hit(`sign-in:${clientKey}:${normalised}`, RATE_RULES.signIn))) return "rate_limited";
    return identity.signIn(normalised, password, callbackPath);
  };
}

export function makeRequestPasswordReset(identity: Identity, limiter: RateLimiter) {
  return async (email: string, redirectPath: string, clientKey: string): Promise<FormResult<"email">> => {
    if (!isValidEmail(email)) return { status: "invalid", errors: { email: "invalid" } };
    if (!(await limiter.hit(`password-reset:${clientKey}`, RATE_RULES.passwordReset))) return { status: "failed", reason: "rate_limited" };
    await identity.requestPasswordReset(email.trim().toLowerCase(), redirectPath);
    return { status: "ok" };
  };
}

export function makeResetPassword(identity: Identity) {
  return async (token: string, password: string, confirmation: string): Promise<FormResult<"password" | "confirmation">> => {
    const result = validateNewPassword(password, confirmation);
    if (!result.ok) return { status: "invalid", errors: result.errors };
    const outcome = await identity.resetPassword(token, result.value);
    return outcome === "reset" ? { status: "ok" } : { status: "failed", reason: outcome };
  };
}
