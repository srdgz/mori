import type { AppLocale } from "@/i18n/routing";
import { localizedUrl } from "./metadata";

export function SiteJsonLd({ locale, description }: { locale: AppLocale; description: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MŌRI Matcha Bar & Culture",
    url: localizedUrl(locale, "/"),
    inLanguage: locale,
    description,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }} />;
}
