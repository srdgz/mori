import "server-only";
import { headers } from "next/headers";
import type { Mailer } from "@/core/application/ports/mailer";
import { createAuth, type Auth } from "@/infrastructure/auth/better-auth";
import { BetterAuthIdentity } from "@/infrastructure/auth/better-auth-identity";
import { getDatabase } from "@/infrastructure/db/client";
import { ConsoleMailer, OutboxMailer, ResendMailer, SmtpMailer } from "@/infrastructure/mail/mailers";

const LOCAL_SECRET = "mori-local-development-secret-not-for-production";

function baseURL(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_ENV === "production" && process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

function trustedOrigins(): string[] {
  const hosts = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean);
  const urls = [baseURL(), process.env.NEXT_PUBLIC_SITE_URL, ...hosts.map((host) => `https://${host}`)];
  return [...new Set(urls.filter((url): url is string => Boolean(url)))];
}

function secret(): string {
  const value = process.env.BETTER_AUTH_SECRET;
  if (value) return value;
  if (process.env.VERCEL_ENV) throw new Error("BETTER_AUTH_SECRET is not set");
  return LOCAL_SECRET;
}

let mailer: Mailer | undefined;

function smtp() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null;
  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 465),
    user: SMTP_USER,
    password: SMTP_PASSWORD,
    from: process.env.MAIL_FROM ?? `MŌRI <${SMTP_USER}>`,
  };
}

export function getMailer(): Mailer {
  if (mailer) return mailer;
  const smtpConfig = smtp();
  if (process.env.MAIL_OUTBOX) mailer = new OutboxMailer(process.env.MAIL_OUTBOX);
  else if (smtpConfig) mailer = new SmtpMailer(smtpConfig);
  else if (process.env.RESEND_API_KEY)
    mailer = new ResendMailer(process.env.RESEND_API_KEY, process.env.MAIL_FROM ?? "MŌRI <onboarding@resend.dev>");
  else mailer = new ConsoleMailer();
  return mailer;
}

function google() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

let auth: Auth | undefined;

export function getAuth(): Auth {
  auth ??= createAuth({
    db: getDatabase(),
    mailer: getMailer(),
    secret: secret(),
    baseURL: baseURL(),
    trustedOrigins: trustedOrigins(),
    google: google(),
  });
  return auth;
}

export function getIdentity(): BetterAuthIdentity {
  return new BetterAuthIdentity(getAuth(), getDatabase(), headers, google() ? ["google"] : []);
}
