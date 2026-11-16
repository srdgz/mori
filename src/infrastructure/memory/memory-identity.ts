import type { Identity, SessionUser, SignInOutcome } from "@/core/application/ports/identity";
import type { Role, UserId } from "@/core/domain/access/actor";
import type { Profile, SignUp } from "@/core/domain/account/account";

type StoredUser = SessionUser & { password: string | null };

export class MemoryIdentity implements Identity {
  readonly users = new Map<string, StoredUser>();
  readonly resetTokens = new Map<string, string>();
  readonly sentResets: string[] = [];
  readonly deleted: string[] = [];
  current: string | null = null;
  private counter = 0;

  addUser(overrides: Partial<StoredUser> & { email: string }, role: Role = "customer"): StoredUser {
    this.counter += 1;
    const user: StoredUser = {
      id: `user-${this.counter}` as UserId,
      name: "Ana",
      emailVerified: true,
      image: null,
      role,
      isDemo: false,
      locale: "es",
      phone: null,
      marketingOptIn: false,
      hasPassword: true,
      password: "matcha-mood-2026",
      ...overrides,
    };
    this.users.set(user.email, user);
    return user;
  }

  signInAs(user: SessionUser | null): void {
    this.current = user?.email ?? null;
  }

  async currentUser(): Promise<SessionUser | null> {
    const user = this.current ? this.users.get(this.current) : undefined;
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      isDemo: user.isDemo,
      locale: user.locale,
      phone: user.phone,
      marketingOptIn: user.marketingOptIn,
      hasPassword: user.hasPassword,
    };
  }

  async signUp(input: SignUp): Promise<"created" | "already_exists"> {
    if (this.users.has(input.email)) return "already_exists";
    {
      this.addUser({
        email: input.email,
        name: input.name,
        locale: input.locale,
        marketingOptIn: input.marketingOptIn,
        password: input.password,
        emailVerified: false,
      });
    }
    return "created";
  }

  async signIn(email: string, password: string): Promise<SignInOutcome> {
    const user = this.users.get(email);
    if (!user || user.password !== password) return "invalid_credentials";
    this.current = email;
    return "signed_in";
  }

  async socialSignInUrl(provider: "google", callbackPath: string): Promise<string> {
    return `https://accounts.example/${provider}?callback=${encodeURIComponent(callbackPath)}`;
  }

  socialProviders(): readonly "google"[] {
    return ["google"];
  }

  async signOut(): Promise<void> {
    this.current = null;
  }

  async requestPasswordReset(email: string): Promise<void> {
    if (!this.users.has(email)) return;
    this.sentResets.push(email);
    this.resetTokens.set(`token-${email}`, email);
  }

  async resetPassword(token: string, password: string): Promise<"reset" | "invalid_token"> {
    const email = this.resetTokens.get(token);
    const user = email ? this.users.get(email) : undefined;
    if (!user) return "invalid_token";
    this.resetTokens.delete(token);
    this.users.set(user.email, { ...user, password });
    return "reset";
  }

  async changePassword(current: string, next: string): Promise<"changed" | "invalid_password"> {
    const user = this.current ? this.users.get(this.current) : undefined;
    if (!user || user.password !== current) return "invalid_password";
    this.users.set(user.email, { ...user, password: next });
    return "changed";
  }

  async updateProfile(profile: Profile): Promise<void> {
    const user = this.current ? this.users.get(this.current) : undefined;
    if (user) this.users.set(user.email, { ...user, ...profile });
  }

  async deleteAccount(password: string | null): Promise<"deleted" | "invalid_password"> {
    const user = this.current ? this.users.get(this.current) : undefined;
    if (!user || (user.hasPassword && user.password !== password)) return "invalid_password";
    this.users.delete(user.email);
    this.deleted.push(user.email);
    this.current = null;
    return "deleted";
  }
}
