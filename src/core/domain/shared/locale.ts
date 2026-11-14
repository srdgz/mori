export const LOCALES = ["es", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export type LocalizedText = Readonly<Record<Locale, string>>;

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
