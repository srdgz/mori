import { DomainError } from "./domain-error";
import type { Locale } from "./locale";

export type Money = Readonly<{ cents: number }>;

const formatters: Record<Locale, Intl.NumberFormat> = {
  es: new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }),
  en: new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }),
};

export function money(cents: number): Money {
  if (!Number.isInteger(cents)) throw new DomainError("money.not_integer", `Money must be whole cents, got ${cents}`);
  if (cents < 0) throw new DomainError("money.negative", `Money cannot be negative, got ${cents}`);
  return { cents };
}

export const ZERO: Money = money(0);

export function add(...amounts: Money[]): Money {
  return money(amounts.reduce((sum, amount) => sum + amount.cents, 0));
}

export function multiply(amount: Money, factor: number): Money {
  if (!Number.isInteger(factor) || factor < 0) throw new DomainError("money.invalid_factor", `Invalid factor ${factor}`);
  return money(amount.cents * factor);
}

export function subtract(amount: Money, other: Money): Money {
  return money(Math.max(0, amount.cents - other.cents));
}

export function percentage(amount: Money, basisPoints: number): Money {
  return money(Math.round((amount.cents * basisPoints) / 10_000));
}

export function includedTax(gross: Money, rateBasisPoints: number): Money {
  return money(Math.round(gross.cents - gross.cents / (1 + rateBasisPoints / 10_000)));
}

export function formatMoney(amount: Money, locale: Locale): string {
  return formatters[locale].format(amount.cents / 100).replace(/ /g, " ");
}
