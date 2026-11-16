import type { MetadataRoute } from "next";
import { container } from "@/composition/container";
import { routing, staticPathnames } from "@/i18n/routing";
import { alternateLanguages, localizedUrl, type Href } from "@/ui/seo/metadata";

function entries(href: Href, priority: number, changeFrequency: "weekly" | "monthly"): MetadataRoute.Sitemap {
  return routing.locales.map((locale) => ({
    url: localizedUrl(locale, href),
    changeFrequency,
    priority,
    alternates: { languages: alternateLanguages(href) },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const drinks = await container().getMenu();
  return [
    ...staticPathnames.flatMap((href) => entries(href, href === "/" ? 1 : 0.7, "monthly")),
    ...drinks.flatMap((drink) => entries({ pathname: "/menu/[slug]", params: { slug: drink.slug } }, 0.8, "weekly")),
  ];
}
