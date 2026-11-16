import type { Role, UserId } from "@/core/domain/access/actor";
import type { Profile, SignUp } from "@/core/domain/account/account";
import type { Locale } from "@/core/domain/shared/locale";

export type SessionUser = Readonly<{
  id: UserId;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: Role;
  isDemo: boolean;
  locale: Locale;
  phone: string | null;
  marketingOptIn: boolean;
  hasPassword: boolean;
}>;

export type SignInOutcome = "signed_in" | "invalid_credentials" | "rate_limited";

export interface Identity {
  currentUser(): Promise<SessionUser | null>;
  signUp(input: SignUp): Promise<"created" | "already_exists" | "rate_limited">;
  signIn(email: string, password: string, callbackPath: string): Promise<SignInOutcome>;
  socialSignInUrl(provider: "google", callbackPath: string): Promise<string>;
  socialProviders(): readonly "google"[];
  signOut(): Promise<void>;
  requestPasswordReset(email: string, redirectPath: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<"reset" | "invalid_token">;
  changePassword(current: string, next: string): Promise<"changed" | "invalid_password">;
  updateProfile(profile: Profile): Promise<void>;
  deleteAccount(password: string | null): Promise<"deleted" | "invalid_password">;
}
