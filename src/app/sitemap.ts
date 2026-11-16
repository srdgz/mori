import type { MetadataRoute } from "next";
import { routing, type AppPathname } from "@/i18n/routing";
import { localizedUrl } from "@/ui/seo/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const pathnames = Object.keys(routing.pathnames) as AppPathname[];
  return pathnames.flatMap((href) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(locale, href),
      changeFrequency: "monthly" as const,
      priority: href === "/" ? 1 : 0.7,
      alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, localizedUrl(l, href)])) },
    })),
  );
}
