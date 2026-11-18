import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { container } from "@/composition/container";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Mark } from "@/ui/brand/Mark";
import { PageHero } from "@/ui/brand/PageHero";
import { photos } from "@/ui/brand/photos";
import { Wave } from "@/ui/brand/Wave";
import { inkOn } from "@/ui/primitives/color";
import { Icon } from "@/ui/primitives/Icon";
import { pageMetadata } from "@/ui/seo/metadata";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "story" });
  return pageMetadata({ locale, href: "/story", title: t("title"), description: t("description") });
}

export default async function StoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, drinks] = await Promise.all([getTranslations("story"), container().getMenu()]);
  const paragraphs = t.raw("name") as string[];
  const pairs = t.raw("pairs") as { yes: string; no: string }[];

  return (
    <>
      <PageHero index="01" eyebrow={t("eyebrow")} lines={t.raw("heroLines") as string[]} lede={t("lede")} kanji="森" />

      <div className="wrap">
        <div className="media aspect-[4/3] md:aspect-[21/9]" data-anim="clip">
          <div className="absolute inset-[-9%_0]" data-parallax="7">
            <Image src={photos.scene} alt={t("bannerAlt")} fill preload fetchPriority="high" sizes="100vw" className="object-cover" />
          </div>
        </div>
      </div>

      <section className="section">
        <div className="wrap grid gap-[clamp(32px,7vw,120px)] md:grid-cols-[minmax(200px,320px)_1fr]">
          <div className="md:sticky md:top-[calc(var(--nav-h)+24px)] md:self-start">
            <span className="eyebrow" data-anim="fade">
              {t("nameK")}
            </span>
            <h2 className="h-md mt-4 text-forest" data-anim="lines">
              {t("nameH")}
            </h2>
            <span data-draw className="mt-8 hidden size-24 text-forest md:block">
              <Mark className="size-full" />
            </span>
          </div>
          <div className="prose-mori">
            {paragraphs.map((p) => (
              <p key={p} data-anim="fade">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-cream">
        <div className="wrap grid items-center gap-[clamp(32px,6vw,100px)] md:grid-cols-2">
          <div>
            <span className="eyebrow" data-anim="fade">
              {t("ideaK")}
            </span>
            <h2 className="h-lg mt-4 text-forest" data-anim="lines">
              {t("ideaH")}
            </h2>
            <p className="lede mt-6" data-anim="fade">
              {t("idea")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="media aspect-[4/5]" data-anim="clip">
              <Image src={photos.together} alt={t("togetherAlt")} fill sizes="(min-width: 48rem) 25vw, 50vw" className="object-cover" />
            </div>
            <div className="media mt-16 aspect-[4/5]" data-anim="clip" data-delay="0.12">
              <Image src={photos.takeaway} alt={t("takeawayAlt")} fill sizes="(min-width: 48rem) 25vw, 50vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      <Wave from="var(--color-cream)" to="var(--color-forest)" />

      <section className="on-dark bg-forest pt-[clamp(40px,6vw,80px)] pb-[clamp(80px,12vw,170px)] text-cream">
        <div className="wrap">
          <span className="eyebrow" data-anim="fade">
            {t("personaK")}
          </span>
          <h2 className="h-lg mt-4 mb-[clamp(36px,5vw,64px)]" data-anim="lines">
            {t("personaH")}
          </h2>
          <ul className="pairs border-t border-line-light">
            {pairs.map((pair, i) => (
              <li key={pair.yes} className="pair" data-anim="fade">
                <span className="pair__idx" aria-hidden="true">
                  0{i + 1}
                </span>
                <span className="pair__yes">{pair.yes},</span>
                <span className="pair__no">{pair.no}.</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Wave from="var(--color-forest)" to="var(--color-paper)" />

      <section className="section pt-[clamp(48px,7vw,96px)]">
        <div className="wrap">
          <div className="max-w-2xl">
            <span className="eyebrow" data-anim="fade">
              {t("cupsK")}
            </span>
            <h2 className="h-lg mt-4 text-forest" data-anim="lines">
              {t("cupsH")}
            </h2>
            <p className="lede mt-5" data-anim="fade">
              {t("cupsP")}
            </p>
          </div>
          <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {drinks.map((drink) => (
              <li key={drink.id} className="cup grid justify-items-center gap-3.5 text-center text-sm font-medium" data-anim="fade">
                <svg className="w-full max-w-[120px]" viewBox="0 0 100 130" aria-hidden="true">
                  <path d="M14 22h72l-8 100H22z" fill={drink.cupColor} stroke="rgb(0 0 0 / .08)" />
                  <rect x="10" y="10" width="80" height="14" rx="6" fill="#252725" />
                  <svg x="32" y="50" width="36" height="35" viewBox="0 0 1232 1204" style={{ color: inkOn(drink.cupColor) }}>
                    <use href="#mori-emblem" />
                  </svg>
                </svg>
                <span>{drink.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section bg-cream text-center">
        <div className="wrap">
          <blockquote
            className="mx-auto max-w-[18ch] font-display text-[clamp(2.2rem,6vw,5.6rem)] leading-none font-semibold tracking-[-.04em] text-forest"
            data-anim="lines"
          >
            Not just matcha. It&apos;s a mood.
          </blockquote>
          <p className="mt-6 text-sm tracking-[.14em] text-ink-soft uppercase" data-anim="fade">
            {t("quoteCite")}
          </p>
          <Link className="btn mt-10" href="/menu" data-magnetic data-anim="fade">
            {t("cta")}
            <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </>
  );
}
