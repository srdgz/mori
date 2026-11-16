import { APIError } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import type { Identity, SessionUser, SignInOutcome } from "@/core/application/ports/identity";
import type { Role, UserId } from "@/core/domain/access/actor";
import type { Profile, SignUp } from "@/core/domain/account/account";
import { isLocale } from "@/core/domain/shared/locale";
import type { Database } from "../db/database";
import { accounts, users } from "../db/schema";
import type { Auth } from "./better-auth";

type HeadersSource = () => Promise<Headers>;

function codeOf(error: unknown): string | undefined {
  if (!(error instanceof APIError)) return undefined;
  const body = error.body as { code?: string } | undefined;
  return body?.code;
}

function statusOf(error: unknown): number | undefined {
  return error instanceof APIError ? error.statusCode : undefined;
}

export class BetterAuthIdentity implements Identity {
  constructor(
    private readonly auth: Auth,
    private readonly db: Database,
    private readonly headers: HeadersSource,
    private readonly providers: readonly "google"[],
  ) {}

  async currentUser(): Promise<SessionUser | null> {
    const session = await this.auth.api.getSession({ headers: await this.headers() });
    if (!session) return null;
    const [row] = await this.db.select().from(users).where(eq(users.id, session.user.id));
    if (!row || row.deletedAt) return null;
    const [credential] = await this.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.userId, row.id), eq(accounts.providerId, "credential")));
    return {
      id: row.id as UserId,
      name: row.name,
      email: row.email,
      emailVerified: row.emailVerified,
      role: row.role as Role,
      isDemo: row.isDemo,
      locale: isLocale(row.locale) ? row.locale : "es",
      phone: row.phone,
      marketingOptIn: row.marketingOptIn,
      hasPassword: Boolean(credential),
    };
  }

  async signUp(input: SignUp, callbackPath: string): Promise<"pending_verification" | "rate_limited"> {
    try {
      await this.auth.api.signUpEmail({
        body: {
          name: input.name,
          email: input.email,
          password: input.password,
          locale: input.locale,
          marketingOptIn: input.marketingOptIn,
          callbackURL: callbackPath,
        },
        headers: await this.headers(),
      });
    } catch (error) {
      if (statusOf(error) === 429) return "rate_limited";
      if (codeOf(error) !== "USER_ALREADY_EXISTS" && codeOf(error) !== "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") throw error;
    }
    return "pending_verification";
  }

  async signIn(email: string, password: string, callbackPath: string): Promise<SignInOutcome> {
    try {
      await this.auth.api.signInEmail({ body: { email, password, callbackURL: callbackPath }, headers: await this.headers() });
      return "signed_in";
    } catch (error) {
      if (codeOf(error) === "EMAIL_NOT_VERIFIED") return "email_not_verified";
      if (statusOf(error) === 429) return "rate_limited";
      if (error instanceof APIError) return "invalid_credentials";
      throw error;
    }
  }

  async socialSignInUrl(provider: "google", callbackPath: string): Promise<string> {
    const result = await this.auth.api.signInSocial({
      body: { provider, callbackURL: callbackPath, errorCallbackURL: callbackPath },
      headers: await this.headers(),
    });
    if (!result.url) throw new Error("The provider did not return a sign-in URL");
    return result.url;
  }

  socialProviders(): readonly "google"[] {
    return this.providers;
  }

  async signOut(): Promise<void> {
    await this.auth.api.signOut({ headers: await this.headers() });
  }

  async requestPasswordReset(email: string, redirectPath: string): Promise<void> {
    await this.auth.api.requestPasswordReset({ body: { email, redirectTo: redirectPath }, headers: await this.headers() });
  }

  async resetPassword(token: string, password: string): Promise<"reset" | "invalid_token"> {
    try {
      await this.auth.api.resetPassword({ body: { token, newPassword: password }, headers: await this.headers() });
      return "reset";
    } catch (error) {
      if (error instanceof APIError) return "invalid_token";
      throw error;
    }
  }

  async changePassword(current: string, next: string): Promise<"changed" | "invalid_password"> {
    try {
      await this.auth.api.changePassword({
        body: { currentPassword: current, newPassword: next, revokeOtherSessions: true },
        headers: await this.headers(),
      });
      return "changed";
    } catch (error) {
      if (error instanceof APIError) return "invalid_password";
      throw error;
    }
  }

  async updateProfile(profile: Profile): Promise<void> {
    const user = await this.currentUser();
    if (!user) return;
    await this.db
      .update(users)
      .set({
        name: profile.name,
        phone: profile.phone,
        locale: profile.locale,
        marketingOptIn: profile.marketingOptIn,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  }

  async deleteAccount(password: string | null): Promise<"deleted" | "invalid_password"> {
    try {
      await this.auth.api.deleteUser({ body: password === null ? {} : { password }, headers: await this.headers() });
      return "deleted";
    } catch (error) {
      if (error instanceof APIError) return "invalid_password";
      throw error;
    }
  }
}
