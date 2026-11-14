import type { StoreInfo } from "@/core/domain/store/store-info";
import { siteUrl } from "./metadata";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function StoreJsonLd({ store }: { store: StoreInfo }) {
  const openingHoursSpecification = Object.entries(store.schedule).flatMap(([day, hours]) =>
    hours ? [{ "@type": "OpeningHoursSpecification", dayOfWeek: DAY_NAMES[Number(day)], opens: hours.opens, closes: hours.closes }] : [],
  );
  const data = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: store.name,
    url: siteUrl,
    servesCuisine: "Matcha",
    priceRange: "€",
    email: store.email,
    telephone: store.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: store.address.street,
      postalCode: store.address.postalCode,
      addressLocality: store.address.city,
      addressCountry: store.address.country,
    },
    openingHoursSpecification,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
