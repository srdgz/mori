import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { account } from "@/composition/container";
import { localize } from "@/core/domain/shared/locale";
import { formatMoney } from "@/core/domain/shared/money";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { productPhoto } from "@/ui/brand/photos";
import { accountMetadata } from "../../shared";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "favourites");
}

export default async function FavouritesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, favourites] = await Promise.all([getTranslations("account.favourites"), account().listFavourites()]);
  return (
    <div className="grid gap-8">
      <header>
        <h1 className="h-lg text-forest">{t("title")}</h1>
        <p className="mt-3 text-ink-soft">{t("lede")}</p>
      </header>
      {favourites.length === 0 ? (
        <p className="text-ink-soft">{t("empty")}</p>
      ) : (
        <ul className="grid gap-[clamp(20px,3vw,32px)] sm:grid-cols-2 xl:grid-cols-3">
          {favourites.map((drink) => (
            <li key={drink.id} className="drink group">
              <Link href={{ pathname: "/menu/[slug]", params: { slug: drink.slug } }} className="grid gap-3">
                <div className="media media--zoom aspect-[4/5]">
                  <Image
                    src={productPhoto(drink.imageKey)}
                    alt={localize(drink.alt, locale)}
                    sizes="(min-width: 80rem) 22vw, (min-width: 40rem) 40vw, 90vw"
                  />
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="h-md text-charcoal">{drink.name}</h2>
                  <span className="font-display font-medium whitespace-nowrap text-forest">{formatMoney(drink.price, locale)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
