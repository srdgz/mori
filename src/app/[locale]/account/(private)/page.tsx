import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { account } from "@/composition/container";
import { formatMoney } from "@/core/domain/shared/money";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { productPhoto } from "@/ui/brand/photos";
import { Icon } from "@/ui/primitives/Icon";
import { accountMetadata } from "../shared";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "overview");
}

function greeting(): "morning" | "afternoon" | "evening" {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Madrid" }).format(new Date()),
  );
  if (hour >= 6 && hour < 14) return "morning";
  return hour >= 14 && hour < 21 ? "afternoon" : "evening";
}

export default async function AccountOverviewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const services = account();
  const [t, { user }, favourites, addresses] = await Promise.all([
    getTranslations("account.overview"),
    services.currentActor(),
    services.listFavourites(),
    services.listAddresses(),
  ]);
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <div className="grid gap-[clamp(28px,4vw,48px)]">
      <header>
        <h1 className="display text-[clamp(2.4rem,5vw,4.4rem)] text-forest">{t(greeting(), { name: firstName })}</h1>
        <p className="lede mt-4">{t("lede")}</p>
      </header>

      {user?.isDemo && (
        <section className="account-card account-card--notice" aria-labelledby="demo-h">
          <h2 id="demo-h" className="font-semibold text-forest">
            {t("demoTitle")}
          </h2>
          <p className="mt-2 max-w-[60ch] text-ink-soft">{t("demoText")}</p>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="account-card bg-matcha" aria-labelledby="orders-h">
          <h2 id="orders-h" className="font-semibold text-forest">
            {t("ordersTitle")}
          </h2>
          <p className="mt-2 text-forest">{t("ordersEmpty")}</p>
          <Link href="/menu" className="link-u mt-5 text-forest">
            {t("seeMenu")}
            <Icon name="arrow" size={16} />
          </Link>
        </section>

        <section className="account-card" aria-labelledby="addresses-h">
          <h2 id="addresses-h" className="font-semibold text-forest">
            {t("addressesTitle")}
          </h2>
          <p className="mt-2 text-ink-soft">{t("addressesCount", { count: addresses.length })}</p>
          <Link href="/account/addresses" className="link-u mt-5 text-forest">
            {t("manage")}
            <Icon name="arrow" size={16} />
          </Link>
        </section>
      </div>

      <section aria-labelledby="favourites-h">
        <h2 id="favourites-h" className="h-md mb-5 text-forest">
          {t("favouritesTitle")}
        </h2>
        {favourites.length === 0 ? (
          <p className="text-ink-soft">{t("favouritesEmpty")}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {favourites.map((drink) => (
              <li key={drink.id}>
                <Link href={{ pathname: "/menu/[slug]", params: { slug: drink.slug } }} className="account-card flex items-center gap-4">
                  <span className="media size-16 flex-none rounded-[10px]">
                    <Image src={productPhoto(drink.imageKey)} alt="" sizes="64px" className="size-full object-cover" />
                  </span>
                  <span className="grid">
                    <span className="font-semibold text-forest">{drink.name}</span>
                    <span className="text-sm text-ink-soft">{formatMoney(drink.price, locale)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
