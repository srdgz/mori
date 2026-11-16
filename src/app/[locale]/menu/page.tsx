import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { container } from "@/composition/container";
import { localize } from "@/core/domain/shared/locale";
import { formatMoney } from "@/core/domain/shared/money";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { PageHero } from "@/ui/brand/PageHero";
import { productPhoto } from "@/ui/brand/photos";
import { Wave } from "@/ui/brand/Wave";
import { Icon } from "@/ui/primitives/Icon";
import { cssVar } from "@/ui/primitives/style";
import { pageMetadata } from "@/ui/seo/metadata";

type Props = { params: Promise<{ locale: AppLocale }> };

type Collection = { name: string; kicker: string; text: string };
type ExtraGroup = { title: string; rows: { label: string; value: string }[] };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "menu" });
  return pageMetadata({ locale, href: "/menu", title: t("title"), description: t("description") });
}

export default async function MenuPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, drinks] = await Promise.all([getTranslations("menu"), container().getMenu()]);
  const collections = t.raw("colls") as Collection[];
  const extras = t.raw("extras") as ExtraGroup[];

  return (
    <>
      <PageHero index="02" eyebrow={t("eyebrow")} lines={t.raw("heroLines") as string[]} lede={t("lede")} />

      <section className="pb-[clamp(80px,12vw,170px)]" aria-labelledby="coll-h">
        <div className="wrap">
          <h2 id="coll-h" className="sr-only">
            {t("collH")}
          </h2>
          <ol className="border-t border-line">
            {drinks.map((drink, i) => (
              <li key={drink.id} id={drink.slug} className="menu-item group scroll-mt-[calc(var(--nav-h)+24px)]" data-anim="fade">
                <span className="menu-item__no font-display font-medium text-ink-soft" aria-hidden="true">
                  0{i + 1}
                </span>
                <div className="menu-item__media media media--zoom aspect-[4/5] rounded-[14px]">
                  <Image
                    src={productPhoto(drink.imageKey)}
                    alt={localize(drink.alt, locale)}
                    sizes="(min-width: 54rem) 220px, 110px"
                    priority={i < 2}
                    className="size-full object-cover"
                  />
                </div>
                <div className="menu-item__body">
                  <h3 className="font-display text-[clamp(1.6rem,3.4vw,3rem)] leading-none font-semibold tracking-tight text-forest">
                    <Link href={{ pathname: "/menu/[slug]", params: { slug: drink.slug } }} className="menu-item__link">
                      {drink.name}
                      <Icon name="arrow" size={22} className="menu-item__arrow" />
                    </Link>
                  </h3>
                  <p className="mt-2.5 mb-3.5 max-w-[48ch] text-ink-soft">{localize(drink.description, locale)}</p>
                  <ul className="flex flex-wrap gap-2">
                    <li className="tag">
                      <i className="chip size-3" style={cssVar("--c", drink.cupColor)} />
                      {localize(drink.cupName, locale)}
                    </li>
                    {drink.tags.map((tag) => (
                      <li key={tag.en} className="tag">
                        {localize(tag, locale)}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="menu-item__price font-display text-[clamp(1.3rem,2vw,1.8rem)] font-semibold whitespace-nowrap text-forest">
                  {formatMoney(drink.price, locale)}
                  <small className="block font-sans text-xs font-normal text-ink-soft md:text-right">{t("size")}</small>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Wave from="var(--color-paper)" to="var(--color-forest)" />

      <section className="on-dark bg-forest pt-[clamp(40px,6vw,80px)] pb-[clamp(80px,12vw,170px)] text-cream" aria-labelledby="more-h">
        <div className="wrap">
          <span className="eyebrow" data-anim="fade">
            {t("moreK")}
          </span>
          <h2 id="more-h" className="h-lg mt-4 mb-[clamp(36px,5vw,64px)]" data-anim="lines">
            {t("moreH")}
          </h2>
          <ul className="grid gap-[clamp(14px,2vw,24px)] md:grid-cols-3">
            {collections.map((c) => (
              <li key={c.name} className="coll" data-anim="fade">
                <span className="text-xs font-semibold tracking-[.18em] text-matcha uppercase">{c.kicker}</span>
                <div>
                  <h3 className="font-display text-[clamp(1.8rem,2.6vw,2.4rem)] leading-none font-semibold tracking-tight">{c.name}</h3>
                  <p className="mt-3 text-sage">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Wave from="var(--color-forest)" to="var(--color-cream)" />

      <section className="section bg-cream pt-[clamp(48px,7vw,96px)]" aria-labelledby="extras-h">
        <div className="wrap">
          <h2 id="extras-h" className="h-lg mb-[clamp(32px,5vw,56px)] text-forest" data-anim="lines">
            {t("extrasK")}
          </h2>
          <div className="grid gap-[clamp(24px,3vw,48px)] md:grid-cols-3">
            {extras.map((group) => (
              <div key={group.title} data-anim="fade">
                <h3 className="mb-3.5 text-xl font-semibold text-forest">{group.title}</h3>
                <ul className="border-t border-line">
                  {group.rows.map((row) => (
                    <li key={row.label} className="flex justify-between gap-3 border-b border-line py-3 text-ink-soft">
                      <span>{row.label}</span>
                      <span className="font-medium whitespace-nowrap text-forest">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-10 flex max-w-[70ch] items-start gap-2.5 text-sm text-ink-soft" data-anim="fade">
            <Icon name="leaf" size={18} className="mt-0.5 flex-none text-forest" />
            {t("note")}
          </p>
        </div>
      </section>

      <section className="section text-center">
        <div className="wrap">
          <h2 className="h-xl mx-auto max-w-[16ch] text-forest" data-anim="lines">
            {t("ctaH")}
          </h2>
          <p className="lede mx-auto mt-5" data-anim="fade">
            {t("ctaP")}
          </p>
          <Link className="btn mt-9" href="/find-us" data-magnetic data-anim="fade">
            {t("cta")}
            <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </>
  );
}
