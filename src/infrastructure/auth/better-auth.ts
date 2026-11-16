import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { sql } from "drizzle-orm";
import type { Mailer } from "@/core/application/ports/mailer";
import { isLocale, type Locale } from "@/core/domain/shared/locale";
import type { Database } from "../db/database";
import { accounts, rateLimits, sessions, users, verifications } from "../db/schema";

export type AuthConfig = {
  db: Database;
  mailer: Mailer;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  google: { clientId: string; clientSecret: string } | null;
};

function localeOf(user: object): Locale {
  const locale = (user as { locale?: unknown }).locale;
  return typeof locale === "string" && isLocale(locale) ? locale : "es";
}

export function createAuth({ db, mailer, secret, baseURL, trustedOrigins, google }: AuthConfig, { nextjs = true } = {}) {
  return betterAuth({
    appName: "MŌRI",
    secret,
    baseURL,
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: users, session: sessions, account: accounts, verification: verifications, rateLimit: rateLimits },
    }),
    advanced: { database: { generateId: "uuid" } },
    user: {
      additionalFields: {
        phone: { type: "string", required: false, input: false },
        locale: { type: "string", required: false, defaultValue: "es", input: true },
        marketingOptIn: { type: "boolean", required: false, defaultValue: false, input: true },
        role: { type: "string", required: false, defaultValue: "customer", input: false },
        isDemo: { type: "boolean", required: false, defaultValue: false, input: false },
      },
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          await db.execute(sql`select anonymize_customer(${user.id})`);
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await mailer.send({ kind: "reset_password", to: user.email, name: user.name, locale: localeOf(user), url });
      },
    },
    socialProviders: google ? { google: { clientId: google.clientId, clientSecret: google.clientSecret, prompt: "select_account" } } : {},
    account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 100 },
    plugins: nextjs ? [nextCookies()] : [],
  });
}

export type Auth = ReturnType<typeof createAuth>;
