import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { container } from "@/composition/container";
import type { Product } from "@/core/domain/catalog/product";
import { localize } from "@/core/domain/shared/locale";
import { formatMoney } from "@/core/domain/shared/money";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { productPhoto } from "@/ui/brand/photos";
import { Icon } from "@/ui/primitives/Icon";
import { cssVar } from "@/ui/primitives/style";
import { ProductJsonLd } from "@/ui/seo/ProductJsonLd";
import { pageMetadata } from "@/ui/seo/metadata";
import { DrinkConfigurator, type ConfiguratorLabels } from "@/ui/shop/DrinkConfigurator";

type Props = { params: Promise<{ locale: AppLocale; slug: string }> };

export async function generateStaticParams() {
  const drinks = await container().getMenu();
  return routing.locales.flatMap((locale) => drinks.map((drink) => ({ locale, slug: drink.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await container().getProduct(slug);
  if (!page) return {};
  const t = await getTranslations({ locale, namespace: "product" });
  const { product } = page;
  return pageMetadata({
    locale,
    href: { pathname: "/menu/[slug]", params: { slug } },
    title: t("title", { name: product.name }),
    description: localize(product.description, locale),
    image: productPhoto(product.imageKey).src,
  });
}

function RelatedDrink({ drink, locale }: { drink: Product; locale: AppLocale }) {
  return (
    <li className="drink group">
      <Link href={{ pathname: "/menu/[slug]", params: { slug: drink.slug } }} className="grid gap-3">
        <div className="media media--zoom aspect-[4/5]">
          <Image src={productPhoto(drink.imageKey)} alt={localize(drink.alt, locale)} sizes="(min-width: 48rem) 30vw, 80vw" />
          <span className="cup-tag absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-full bg-paper py-1.5 pr-3 pl-1.5 text-xs font-medium">
            <i className="chip" style={cssVar("--c", drink.cupColor)} />
            {localize(drink.cupName, locale)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="h-md text-charcoal">{drink.name}</h3>
          <span className="font-display font-medium whitespace-nowrap text-forest">{formatMoney(drink.price, locale)}</span>
        </div>
      </Link>
    </li>
  );
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [t, page] = await Promise.all([getTranslations("product"), container().getProduct(slug)]);
  if (!page) notFound();
  const { product, related } = page;

  const labels: ConfiguratorLabels = {
    configure: t("configure"),
    optional: t("optional"),
    soldOutOption: t("soldOutOption"),
    quantity: t("quantity"),
    less: t("less"),
    more: t("more"),
    unitPrice: t.raw("unitPrice") as string,
    add: t.raw("add") as string,
    soon: t("soon"),
  };

  return (
    <>
      <ProductJsonLd product={product} locale={locale} menuName={t("menu")} />

      <section className="pt-[calc(var(--nav-h)+clamp(24px,5vw,64px))] pb-[clamp(64px,9vw,128px)]">
        <div className="wrap grid items-start gap-[clamp(28px,5vw,80px)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="product-media">
            <div className="media hero-zoom aspect-[5/4] md:aspect-[4/5]">
              <Image
                src={productPhoto(product.imageKey)}
                alt={localize(product.alt, locale)}
                sizes="(min-width: 48rem) 45vw, 100vw"
                priority
                className="size-full object-cover"
              />
            </div>
          </div>

          <div>
            <nav aria-label={t("breadcrumb")} className="hero-in mb-6 text-sm text-ink-soft">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/menu" className="link-u text-forest">
                    <Icon name="left" size={16} />
                    {t("menu")}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page">{product.name}</li>
              </ol>
            </nav>

            <ul className="hero-in flex flex-wrap gap-2">
              <li className="tag">
                <i className="chip size-3" style={cssVar("--c", product.cupColor)} />
                {localize(product.cupName, locale)}
              </li>
              {product.tags.map((tag) => (
                <li key={tag.en} className="tag">
                  {localize(tag, locale)}
                </li>
              ))}
            </ul>

            <h1 className="display mt-5 text-[clamp(2.8rem,6.4vw,6rem)] text-forest">
              <span className="line-mask block">
                <span className="line-in">{product.name}</span>
              </span>
            </h1>
            <p className="lede hero-in mt-5">{localize(product.shortDescription, locale)}</p>
            <p className="hero-in mt-4 max-w-[56ch] text-ink-soft">{localize(product.description, locale)}</p>

            <div className="mt-[clamp(28px,4vw,44px)] border-t border-line pt-[clamp(24px,3vw,36px)]">
              {product.isAvailable ? (
                <DrinkConfigurator product={product} locale={locale} labels={labels} />
              ) : (
                <div className="rounded-[14px] bg-cream p-6">
                  <p className="font-display text-xl font-semibold text-forest">{t("soldOut")}</p>
                  <p className="mt-2 text-ink-soft">{t("soldOutText")}</p>
                </div>
              )}
            </div>

            <p className="mt-6 flex items-start gap-2.5 text-sm text-ink-soft">
              <Icon name="leaf" size={18} className="mt-0.5 flex-none text-forest" />
              {t("allergens")}
            </p>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-cream py-[clamp(64px,9vw,128px)]" aria-labelledby="related-h">
          <div className="wrap">
            <h2 id="related-h" className="h-lg mb-[clamp(28px,4vw,48px)] text-forest" data-anim="lines">
              {t("related")}
            </h2>
            <ul className="grid gap-[clamp(20px,3vw,36px)] sm:grid-cols-2 md:grid-cols-3">
              {related.map((drink) => (
                <RelatedDrink key={drink.id} drink={drink} locale={locale} />
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
