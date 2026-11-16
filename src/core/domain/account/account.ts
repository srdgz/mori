import { isLocale, type Locale } from "../shared/locale";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const NAME_MAX = 80;

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export type Validation<T, K extends string> = { ok: true; value: T } | { ok: false; errors: FieldErrors<K> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ]{9,16}$/;

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function result<T, K extends string>(value: T, errors: FieldErrors<K>): Validation<T, K> {
  return Object.keys(errors).length === 0 ? { ok: true, value } : { ok: false, errors };
}

export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (password.length < PASSWORD_MIN) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  const score = (password.length >= 12 ? 1 : 0) + (password.length >= 16 ? 1 : 0) + Math.max(0, variety - 1);
  return Math.min(4, Math.max(1, score)) as 1 | 2 | 3 | 4;
}

function passwordError(password: string): string | undefined {
  if (password.length < PASSWORD_MIN) return "too_short";
  if (password.length > PASSWORD_MAX) return "too_long";
  return undefined;
}

function nameError(name: string): string | undefined {
  if (name.length === 0) return "required";
  if (name.length > NAME_MAX) return "too_long";
  return undefined;
}

export type SignUpInput = { name: string; email: string; password: string; locale: string; privacy: boolean; marketing: boolean };
export type SignUp = { name: string; email: string; password: string; locale: Locale; marketingOptIn: boolean };
type SignUpField = "name" | "email" | "password" | "privacy";

export function validateSignUp(input: SignUpInput): Validation<SignUp, SignUpField> {
  const name = clean(input.name);
  const email = input.email.trim().toLowerCase();
  const errors: FieldErrors<SignUpField> = {};
  const nameProblem = nameError(name);
  if (nameProblem) errors.name = nameProblem;
  if (!EMAIL.test(email)) errors.email = "invalid";
  const passwordProblem = passwordError(input.password);
  if (passwordProblem) errors.password = passwordProblem;
  if (!input.privacy) errors.privacy = "required";
  const locale = isLocale(input.locale) ? input.locale : "es";
  return result({ name, email, password: input.password, locale, marketingOptIn: input.marketing }, errors);
}

export type ProfileInput = { name: string; phone: string; locale: string; marketing: boolean };
export type Profile = { name: string; phone: string | null; locale: Locale; marketingOptIn: boolean };
type ProfileField = "name" | "phone" | "locale";

export function validateProfile(input: ProfileInput): Validation<Profile, ProfileField> {
  const name = clean(input.name);
  const phone = clean(input.phone);
  const errors: FieldErrors<ProfileField> = {};
  const nameProblem = nameError(name);
  if (nameProblem) errors.name = nameProblem;
  if (phone !== "" && !PHONE.test(phone)) errors.phone = "invalid";
  if (!isLocale(input.locale)) errors.locale = "invalid";
  return result({ name, phone: phone === "" ? null : phone, locale: input.locale as Locale, marketingOptIn: input.marketing }, errors);
}

export function validateNewPassword(password: string, confirmation: string): Validation<string, "password" | "confirmation"> {
  const errors: FieldErrors<"password" | "confirmation"> = {};
  const problem = passwordError(password);
  if (problem) errors.password = problem;
  else if (password !== confirmation) errors.confirmation = "mismatch";
  return result(password, errors);
}

export function isValidEmail(email: string): boolean {
  return EMAIL.test(email.trim());
}
