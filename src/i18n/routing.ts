import { defineRouting } from "next-intl/routing";

export const locales = ["es", "en"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "es",
  localePrefix: "as-needed",
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/story": { es: "/historia", en: "/story" },
    "/menu": { es: "/carta", en: "/menu" },
    "/menu/[slug]": { es: "/carta/[slug]", en: "/menu/[slug]" },
    "/culture": { es: "/cultura-matcha", en: "/matcha-culture" },
    "/find-us": { es: "/donde-estamos", en: "/find-us" },
    "/contact": { es: "/contacto", en: "/contact" },
  },
});

export type AppPathname = keyof typeof routing.pathnames;

export type StaticPathname = Exclude<AppPathname, `${string}[${string}`>;

export const staticPathnames = Object.keys(routing.pathnames).filter((p) => !p.includes("[")) as StaticPathname[];

export const navItems = [
  { href: "/story", key: "story" },
  { href: "/menu", key: "menu" },
  { href: "/culture", key: "culture" },
  { href: "/find-us", key: "findUs" },
  { href: "/contact", key: "contact" },
] as const satisfies ReadonlyArray<{ href: AppPathname; key: string }>;
