import { describe, expect, it } from "vitest";
import { isValidEmail, passwordStrength, validateNewPassword, validateProfile, validateSignUp } from "./account";

const signUp = {
  name: "  Ana   López ",
  email: " Ana@Example.com ",
  password: "matcha-mood-2026",
  locale: "en",
  privacy: true,
  marketing: false,
};

describe("validateSignUp", () => {
  it("normalises the name and email", () => {
    expect(validateSignUp(signUp)).toEqual({
      ok: true,
      value: { name: "Ana López", email: "ana@example.com", password: "matcha-mood-2026", locale: "en", marketingOptIn: false },
    });
  });

  it("falls back to Spanish for an unknown locale", () => {
    const result = validateSignUp({ ...signUp, locale: "fr" });
    expect(result.ok && result.value.locale).toBe("es");
  });

  it("reports every invalid field", () => {
    expect(validateSignUp({ name: " ", email: "ana@", password: "short", locale: "es", privacy: false, marketing: true })).toEqual({
      ok: false,
      errors: { name: "required", email: "invalid", password: "too_short", privacy: "required" },
    });
  });

  it("limits the name and password length", () => {
    const result = validateSignUp({ ...signUp, name: "x".repeat(81), password: "x".repeat(129) });
    expect(result).toEqual({ ok: false, errors: { name: "too_long", password: "too_long" } });
  });
});

describe("validateProfile", () => {
  it("accepts an empty phone as no phone", () => {
    expect(validateProfile({ name: "Ana", phone: "  ", locale: "es", marketing: true })).toEqual({
      ok: true,
      value: { name: "Ana", phone: null, locale: "es", marketingOptIn: true },
    });
  });

  it("keeps a valid phone", () => {
    const result = validateProfile({ name: "Ana", phone: "+34 600 000 000", locale: "en", marketing: false });
    expect(result.ok && result.value.phone).toBe("+34 600 000 000");
  });

  it("rejects a bad phone, a missing name and an unknown locale", () => {
    expect(validateProfile({ name: "", phone: "call me", locale: "fr", marketing: false })).toEqual({
      ok: false,
      errors: { name: "required", phone: "invalid", locale: "invalid" },
    });
  });
});

describe("validateNewPassword", () => {
  it("accepts matching passwords", () => {
    expect(validateNewPassword("matcha-2026!", "matcha-2026!")).toEqual({ ok: true, value: "matcha-2026!" });
  });

  it("checks length before the confirmation", () => {
    expect(validateNewPassword("short", "other")).toEqual({ ok: false, errors: { password: "too_short" } });
  });

  it("rejects a confirmation that does not match", () => {
    expect(validateNewPassword("matcha-2026!", "matcha-2025!")).toEqual({ ok: false, errors: { confirmation: "mismatch" } });
  });
});

describe("passwordStrength", () => {
  it.each([
    ["short", 0],
    ["matchama", 1],
    ["Matchamatcha", 2],
    ["Matcha-matcha-26", 4],
    ["matchamatchamatcha", 2],
  ] as const)("rates %s as %i", (password, score) => {
    expect(passwordStrength(password)).toBe(score);
  });
});

describe("isValidEmail", () => {
  it("checks the shape of an email", () => {
    expect(isValidEmail(" ana@example.com ")).toBe(true);
    expect(isValidEmail("ana@example")).toBe(false);
  });
});
