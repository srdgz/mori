import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { admin } from "@/composition/checkout";
import { Link, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { ProductTable, Switch } from "@/ui/admin/ProductsClient";
import { Icon } from "@/ui/primitives/Icon";
import { setOptionAvailabilityAction, setProductAvailabilityAction } from "../actions";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "admin" });
  return { title: t("metaTitle", { page: t("nav.products") }), robots: { index: false } };
}

export default async function ProductsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, data] = await Promise.all([getTranslations("admin.products"), admin().listProducts()]);
  if (!data) redirect({ href: "/admin/orders", locale });
  if (!data) return null;

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[clamp(2rem,4vw,3.2rem)] text-forest">{t("title")}</h1>
          <p className="lede mt-3">{t("lede")}</p>
        </div>
        <Link href="/admin/products/new" className="btn">
          {t("add")}
          <Icon name="plus" size={16} />
        </Link>
      </header>

      <ProductTable
        products={data.products}
        locale={locale}
        setAvailability={setProductAvailabilityAction}
        labels={{
          search: t("search"),
          available: t("available"),
          soldOut: t("soldOut"),
          availabilityLabel: t("availabilityLabel", { name: "{name}" }),
          edit: t("edit"),
          featured: t("featured"),
          noResults: t("noResults"),
        }}
      />

      <section className="grid gap-4" aria-labelledby="options-h">
        <div>
          <h2 id="options-h" className="h-md text-forest">
            {t("optionsTitle")}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">{t("optionsLede")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {data.groups.map((group) => (
            <div key={group.id} className="account-card grid content-start gap-1">
              <h3 className="font-semibold text-forest">{group.name[locale]}</h3>
              <ul>
                {group.options.map((option) => (
                  <li key={option.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-forest">{option.name[locale]}</span>
                    <Switch
                      checked={option.isAvailable}
                      label={t("optionLabel", { name: option.name[locale] })}
                      onLabel={t("available")}
                      offLabel={t("soldOut")}
                      onChange={setOptionAvailabilityAction.bind(null, option.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
