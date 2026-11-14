import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type AppLocale, type AppPathname } from "@/i18n/routing";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mori-matcha-bar.vercel.app";

export function localizedUrl(locale: AppLocale, href: AppPathname): string {
  return new URL(getPathname({ locale, href }), siteUrl).href;
}

type Input = { locale: AppLocale; href: AppPathname; title: string; description: string };

export function pageMetadata({ locale, href, title, description }: Input): Metadata {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, localizedUrl(l, href)]));
  return {
    title,
    description,
    alternates: {
      canonical: localizedUrl(locale, href),
      languages: { ...languages, "x-default": localizedUrl(routing.defaultLocale, href) },
    },
    openGraph: {
      type: "website",
      siteName: "MŌRI Matcha Bar & Culture",
      title,
      description,
      url: localizedUrl(locale, href),
      locale: locale === "es" ? "es_ES" : "en_GB",
      images: [{ url: "/og.jpg", width: 1200, height: 675 }],
    },
    twitter: { card: "summary_large_image" },
  };
}
