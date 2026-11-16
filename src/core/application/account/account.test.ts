import { beforeEach, describe, expect, it } from "vitest";
import type { AddressInput } from "@/core/domain/account/address";
import { MemoryAddressRepository, MemoryFavouriteRepository } from "@/infrastructure/memory/memory-account-repositories";
import { MemoryCatalogRepository } from "@/infrastructure/memory/memory-catalog-repository";
import { MemoryIdentity } from "@/infrastructure/memory/memory-identity";
import { MemoryMailer } from "@/infrastructure/memory/memory-mailer";
import { MemoryRateLimiter } from "@/infrastructure/memory/memory-rate-limiter";
import { systemClock } from "@/infrastructure/clock";
import { catalogSeed } from "@/infrastructure/seed/catalog";
import { MAX_ADDRESSES, makeListAddresses, makeRemoveAddress, makeSaveAddress } from "./addresses";
import { makeListFavourites, makeToggleFavourite } from "./favourites";
import { makeChangePassword, makeDeleteAccount, makeUpdateProfile } from "./profile";
import { currentActor, makeRequestPasswordReset, makeResetPassword, makeSignIn, makeSignUp } from "./session";

let identity: MemoryIdentity;
let mailer: MemoryMailer;
let limiter: MemoryRateLimiter;

const home: AddressInput = {
  label: "Casa",
  line1: "C/ del Pez 12",
  line2: "",
  postalCode: "28004",
  city: "Madrid",
  instructions: "",
  isDefault: false,
};

beforeEach(() => {
  identity = new MemoryIdentity();
  mailer = new MemoryMailer();
  limiter = new MemoryRateLimiter(systemClock);
});

describe("session", () => {
  it("treats a visitor without a session as a guest", async () => {
    expect(await currentActor(identity)).toEqual({ actor: { kind: "guest" }, user: null });
  });

  it("maps the signed-in user to an actor", async () => {
    identity.signInAs(identity.addUser({ email: "staff@demo.mori", isDemo: true }, "staff"));
    expect((await currentActor(identity)).actor).toEqual({ kind: "staff", id: "user-1", demo: true });
  });

  it("validates sign-up before creating the account", async () => {
    const signUp = makeSignUp(identity, limiter);
    expect(
      await signUp({ name: "", email: "x", password: "1", locale: "es", privacy: false, marketing: false }, "/cuenta", "ip"),
    ).toMatchObject({
      status: "invalid",
    });
    expect(identity.users.size).toBe(0);
    expect(
      await signUp(
        { name: "Ana", email: "Ana@Example.com", password: "matcha-mood-2026", locale: "es", privacy: true, marketing: false },
        "/cuenta",
        "ip",
      ),
    ).toEqual({ status: "ok" });
    expect(identity.users.get("ana@example.com")?.emailVerified).toBe(false);
  });

  it("answers the same for a new and an existing email", async () => {
    identity.addUser({ email: "ana@example.com" });
    const signUp = makeSignUp(identity, limiter);
    const input = { name: "Ana", email: "ana@example.com", password: "matcha-mood-2026", locale: "es", privacy: true, marketing: false };
    expect(await signUp(input, "/cuenta", "ip")).toEqual({ status: "ok" });
  });

  it("rejects malformed credentials without asking the provider", async () => {
    const signIn = makeSignIn(identity, limiter);
    expect(await signIn("not-an-email", "x", "/cuenta", "ip")).toBe("invalid_credentials");
    expect(await signIn("ana@example.com", "", "/cuenta", "ip")).toBe("invalid_credentials");
  });

  it("signs in with a normalised email", async () => {
    identity.addUser({ email: "ana@example.com" });
    expect(await makeSignIn(identity, limiter)(" ANA@example.com ", "matcha-mood-2026", "/cuenta", "ip")).toBe("signed_in");
  });

  it("rate limits sign-in attempts per client and email", async () => {
    identity.addUser({ email: "ana@example.com" });
    const signIn = makeSignIn(identity, limiter);
    for (let i = 0; i < 5; i++) expect(await signIn("ana@example.com", "wrong", "/cuenta", "ip")).toBe("invalid_credentials");
    expect(await signIn("ana@example.com", "matcha-mood-2026", "/cuenta", "ip")).toBe("rate_limited");
    expect(await signIn("ana@example.com", "matcha-mood-2026", "/cuenta", "other-ip")).toBe("signed_in");
  });

  it("rate limits sign-ups and reset requests", async () => {
    const signUp = makeSignUp(identity, limiter);
    const input = { name: "Ana", email: "ana@example.com", password: "matcha-mood-2026", locale: "es", privacy: true, marketing: false };
    for (let i = 0; i < 5; i++) await signUp(input, "/cuenta", "ip");
    expect(await signUp(input, "/cuenta", "ip")).toEqual({ status: "failed", reason: "rate_limited" });
    const request = makeRequestPasswordReset(identity, limiter);
    for (let i = 0; i < 3; i++) await request("ana@example.com", "/x", "ip");
    expect(await request("ana@example.com", "/x", "ip")).toEqual({ status: "failed", reason: "rate_limited" });
  });

  it("does not reveal whether an email exists when asking for a reset", async () => {
    const request = makeRequestPasswordReset(identity, limiter);
    expect(await request("nobody@example.com", "/cuenta/nueva-contrasena", "ip")).toEqual({ status: "ok" });
    expect(await request("bad", "/cuenta/nueva-contrasena", "ip")).toEqual({ status: "invalid", errors: { email: "invalid" } });
  });

  it("resets a password with a valid token only", async () => {
    identity.addUser({ email: "ana@example.com" });
    await makeRequestPasswordReset(identity, limiter)("ana@example.com", "/x", "ip");
    const reset = makeResetPassword(identity);
    expect(await reset("token-ana@example.com", "short", "short")).toMatchObject({ status: "invalid" });
    expect(await reset("token-ana@example.com", "new-matcha-26", "new-matcha-26")).toEqual({ status: "ok" });
    expect(await reset("token-ana@example.com", "new-matcha-26", "new-matcha-26")).toEqual({ status: "failed", reason: "invalid_token" });
  });
});

describe("profile", () => {
  it("requires a session", async () => {
    await expect(makeUpdateProfile(identity)({ name: "Ana", phone: "", locale: "es", marketing: false })).rejects.toMatchObject({
      code: "auth.required",
    });
  });

  it("updates a validated profile", async () => {
    identity.signInAs(identity.addUser({ email: "ana@example.com" }));
    const update = makeUpdateProfile(identity);
    expect(await update({ name: "", phone: "", locale: "es", marketing: false })).toMatchObject({ status: "invalid" });
    expect(await update({ name: "Ana María", phone: "600 000 000", locale: "en", marketing: true })).toEqual({ status: "ok" });
    expect(await identity.currentUser()).toMatchObject({ name: "Ana María", phone: "600 000 000", locale: "en", marketingOptIn: true });
  });

  it("changes the password and sends a notice", async () => {
    identity.signInAs(identity.addUser({ email: "ana@example.com" }));
    const change = makeChangePassword(identity, mailer);
    expect(await change("wrong", "new-matcha-26", "new-matcha-26")).toEqual({ status: "invalid", errors: { current: "wrong" } });
    expect(await change("matcha-mood-2026", "new-matcha-26", "other")).toEqual({ status: "invalid", errors: { confirmation: "mismatch" } });
    expect(await change("matcha-mood-2026", "new-matcha-26", "new-matcha-26")).toEqual({ status: "ok" });
    expect(mailer.sent).toEqual([{ kind: "password_changed", to: "ana@example.com", name: "Ana", locale: "es" }]);
  });

  it("stops the shared demo staff account from changing its password", async () => {
    identity.signInAs(identity.addUser({ email: "staff@demo.mori", isDemo: true }, "staff"));
    await expect(makeChangePassword(identity, mailer)("matcha-mood-2026", "new-matcha-26", "new-matcha-26")).rejects.toMatchObject({
      code: "access.denied",
    });
  });

  it("deletes the account only with a confirmation word and the password", async () => {
    identity.signInAs(identity.addUser({ email: "ana@example.com", locale: "en" }));
    const remove = makeDeleteAccount(identity);
    expect(await remove("BORRAR", "matcha-mood-2026")).toEqual({ status: "invalid", errors: { confirmation: "mismatch" } });
    expect(await remove("DELETE", "wrong")).toEqual({ status: "invalid", errors: { password: "wrong" } });
    expect(await remove(" DELETE ", "matcha-mood-2026")).toEqual({ status: "ok" });
    expect(identity.deleted).toEqual(["ana@example.com"]);
  });

  it("lets a Google-only account delete itself without a password", async () => {
    identity.signInAs(identity.addUser({ email: "ana@gmail.com", hasPassword: false, password: null }));
    expect(await makeDeleteAccount(identity)("ELIMINAR", "")).toEqual({ status: "ok" });
  });
});

describe("addresses", () => {
  let repository: MemoryAddressRepository;

  beforeEach(() => {
    repository = new MemoryAddressRepository();
    identity.signInAs(identity.addUser({ email: "ana@example.com" }));
  });

  it("makes the first address the default and lists the default first", async () => {
    const save = makeSaveAddress(identity, repository);
    await save(null, { ...home, label: "Oficina" });
    await save(null, { ...home, label: "Casa" });
    expect((await makeListAddresses(identity, repository)()).map((a) => [a.label, a.isDefault])).toEqual([
      ["Oficina", true],
      ["Casa", false],
    ]);
  });

  it("moves the default when another address is marked", async () => {
    const save = makeSaveAddress(identity, repository);
    await save(null, home);
    await save(null, { ...home, label: "Oficina", isDefault: true });
    const [first] = await makeListAddresses(identity, repository)();
    expect(first?.label).toBe("Oficina");
  });

  it("validates, updates and removes", async () => {
    const save = makeSaveAddress(identity, repository);
    expect(await save(null, { ...home, postalCode: "x" })).toEqual({ status: "invalid", errors: { postalCode: "invalid" } });
    await save(null, home);
    const [address] = await makeListAddresses(identity, repository)();
    expect(await save(address!.id, { ...home, line1: "Pez 14" })).toEqual({ status: "ok" });
    expect((await repository.forUser(address!.userId))[0]?.line1).toBe("Pez 14");
    expect(await makeRemoveAddress(identity, repository)(address!.id)).toBe(true);
    expect(await repository.forUser(address!.userId)).toEqual([]);
  });

  it("does not touch another customer's address", async () => {
    const save = makeSaveAddress(identity, repository);
    await save(null, home);
    const [address] = await makeListAddresses(identity, repository)();
    identity.signInAs(identity.addUser({ email: "eva@example.com" }));
    expect(await save(address!.id, home)).toEqual({ status: "failed", reason: "not_found" });
    expect(await makeRemoveAddress(identity, repository)(address!.id)).toBe(false);
  });

  it("limits how many addresses a customer keeps", async () => {
    const save = makeSaveAddress(identity, repository);
    for (let i = 0; i < MAX_ADDRESSES; i++) await save(null, { ...home, label: `Casa ${i}` });
    expect(await save(null, home)).toEqual({ status: "failed", reason: "limit" });
  });
});

describe("favourites", () => {
  it("toggles a drink and lists favourites in menu order", async () => {
    identity.signInAs(identity.addUser({ email: "ana@example.com" }));
    const catalog = new MemoryCatalogRepository(catalogSeed);
    const repository = new MemoryFavouriteRepository();
    const toggle = makeToggleFavourite(identity, repository, catalog);
    expect(await toggle("dirty-matcha")).toBe("added");
    expect(await toggle("classic-matcha")).toBe("added");
    expect(await toggle("hojicha")).toBe("not_found");
    expect((await makeListFavourites(identity, repository, catalog)()).map((p) => p.slug)).toEqual(["classic-matcha", "dirty-matcha"]);
    expect(await toggle("dirty-matcha")).toBe("removed");
  });
});
