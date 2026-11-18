import type { Product } from "@/core/domain/catalog/product";
import type { RatingSummary } from "@/core/domain/catalog/review";
import { localize, type Locale } from "@/core/domain/shared/locale";
import { productPhoto } from "@/ui/brand/photos";
import { localizedUrl, siteUrl } from "./metadata";

type Props = { product: Product; locale: Locale; menuName: string; rating?: RatingSummary };

export function ProductJsonLd({ product, locale, menuName, rating }: Props) {
  const url = localizedUrl(locale, { pathname: "/menu/[slug]", params: { slug: product.slug } });
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: localize(product.description, locale),
      image: new URL(productPhoto(product.imageKey).src, siteUrl).href,
      brand: { "@type": "Brand", name: "MŌRI" },
      ...(rating && rating.count > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: rating.average,
              reviewCount: rating.count,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
      url,
      offers: {
        "@type": "Offer",
        price: (product.price.cents / 100).toFixed(2),
        priceCurrency: "EUR",
        availability: product.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: menuName, item: localizedUrl(locale, "/menu") },
        { "@type": "ListItem", position: 2, name: product.name, item: url },
      ],
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
