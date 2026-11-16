import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mori-matcha-bar.vercel.app";

export type Href = Parameters<typeof getPathname>[0]["href"];

export function localizedUrl(locale: AppLocale, href: Href): string {
  return new URL(getPathname({ locale, href }), siteUrl).href;
}

export function alternateLanguages(href: Href): Record<string, string> {
  return Object.fromEntries(routing.locales.map((l) => [l, localizedUrl(l, href)]));
}

type Input = { locale: AppLocale; href: Href; title: string; description: string; image?: string };

export function pageMetadata({ locale, href, title, description, image = "/og.jpg" }: Input): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: localizedUrl(locale, href),
      languages: { ...alternateLanguages(href), "x-default": localizedUrl(routing.defaultLocale, href) },
    },
    openGraph: {
      type: "website",
      siteName: "MŌRI Matcha Bar & Culture",
      title,
      description,
      url: localizedUrl(locale, href),
      locale: locale === "es" ? "es_ES" : "en_GB",
      images: [{ url: image, width: 1200, height: 675 }],
    },
    twitter: { card: "summary_large_image" },
  };
}
