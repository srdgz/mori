import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { MemoryMailer } from "../memory/memory-mailer";
import { orders, users } from "../db/schema";
import { createTestDatabase, type TestDatabase } from "../db/testing";
import { createAuth, type Auth } from "./better-auth";
import { BetterAuthIdentity } from "./better-auth-identity";

let test: TestDatabase;
let auth: Auth;
let identity: BetterAuthIdentity;
let cookie = "";
const mailer = new MemoryMailer();

const ana = { name: "Ana López", email: "ana@example.com", password: "matcha-mood-2026", locale: "en" as const, marketingOptIn: true };

function lastUrl(kind: "reset_password"): string {
  const email = mailer.sent.filter((e) => e.kind === kind && e.to === ana.email).at(-1);
  if (!email || !("url" in email)) throw new Error(`No ${kind} email`);
  return email.url;
}

async function signInForCookie(password: string): Promise<void> {
  const result = await auth.api.signInEmail({ body: { email: ana.email, password }, returnHeaders: true });
  cookie = result.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createAuth(
    {
      db: test.db,
      mailer,
      secret: "test-secret-that-is-long-enough-123456",
      baseURL: "http://localhost:3000",
      trustedOrigins: [],
      google: null,
    },
    { nextjs: false },
  );
  identity = new BetterAuthIdentity(auth, test.db, async () => new Headers(cookie ? { cookie } : {}), []);
});

afterAll(async () => {
  await test.client.close();
});

describe("BetterAuthIdentity", () => {
  it("signs up with the profile fields and sends no confirmation email", async () => {
    expect(await identity.signUp(ana)).toBe("created");
    const [row] = await test.db.select().from(users).where(eq(users.email, ana.email));
    expect(row).toMatchObject({ name: "Ana López", locale: "en", marketingOptIn: true, role: "customer", emailVerified: false });
    expect(mailer.sent).toEqual([]);
  });

  it("reports an email that already has an account", async () => {
    expect(await identity.signUp({ ...ana, password: "another-password-1" })).toBe("already_exists");
  });

  it("does not let a visitor choose their own role", async () => {
    await auth.api
      .signUpEmail({ body: { name: "Eve", email: "eve@example.com", password: "matcha-mood-2026", role: "admin", isDemo: true } as never })
      .catch(() => undefined);
    const rows = await test.db.select({ role: users.role, isDemo: users.isDemo }).from(users).where(eq(users.email, "eve@example.com"));
    expect(rows).toEqual([{ role: "customer", isDemo: false }]);
  });

  it("lets the customer sign in before confirming the email", async () => {
    expect(await identity.signIn(ana.email, ana.password, "/en/account")).toBe("signed_in");
  });

  it("rejects a wrong password without saying which part was wrong", async () => {
    expect(await identity.signIn(ana.email, "wrong-password", "/en/account")).toBe("invalid_credentials");
    expect(await identity.signIn("nobody@example.com", ana.password, "/en/account")).toBe("invalid_credentials");
  });

  it("reads the signed-in user", async () => {
    expect(await identity.signIn(ana.email, ana.password, "/en/account")).toBe("signed_in");
    await signInForCookie(ana.password);
    expect(await identity.currentUser()).toMatchObject({
      name: "Ana López",
      email: ana.email,
      role: "customer",
      isDemo: false,
      locale: "en",
      hasPassword: true,
    });
  });

  it("updates the profile", async () => {
    await identity.updateProfile({ name: "Ana María", phone: "600 000 000", locale: "es", marketingOptIn: false });
    expect(await identity.currentUser()).toMatchObject({ name: "Ana María", phone: "600 000 000", locale: "es", marketingOptIn: false });
  });

  it("changes the password only with the current one", async () => {
    expect(await identity.changePassword("wrong-password", "new-matcha-2026")).toBe("invalid_password");
    expect(await identity.changePassword(ana.password, "new-matcha-2026")).toBe("changed");
    await signInForCookie("new-matcha-2026");
  });

  it("resets the password with the emailed token once", async () => {
    await identity.requestPasswordReset(ana.email, "/cuenta/nueva-contrasena");
    const token = new URL(lastUrl("reset_password")).pathname.split("/").at(-1)!;
    expect(await identity.resetPassword(token, "reset-matcha-2026")).toBe("reset");
    expect(await identity.resetPassword(token, "again-matcha-2026")).toBe("invalid_token");
    expect(await identity.currentUser()).toBeNull();
    await signInForCookie("reset-matcha-2026");
  });

  it("deletes the account, keeping its orders anonymised", async () => {
    const user = await identity.currentUser();
    await test.db.execute(
      sql`select create_order(${JSON.stringify({
        code: "MR-DEL1",
        customer_id: user!.id,
        contact_name: "Ana",
        contact_email: ana.email,
        contact_phone: "600000000",
        locale: "es",
        fulfilment: "pickup",
        slot_start: "2026-11-20T10:00:00Z",
        subtotal_cents: 450,
        total_cents: 450,
        vat_cents: 41,
      })}::jsonb, '[]'::jsonb)`,
    );

    expect(await identity.deleteAccount("wrong-password")).toBe("invalid_password");
    expect(await identity.deleteAccount("reset-matcha-2026")).toBe("deleted");

    expect(await test.db.$count(users, eq(users.id, user!.id))).toBe(0);
    const [order] = await test.db.select().from(orders).where(eq(orders.code, "MR-DEL1"));
    expect(order).toMatchObject({ customerId: null, contactName: "Deleted customer", totalCents: 450 });
  });
});
