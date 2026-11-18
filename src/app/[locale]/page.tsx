import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { container } from "@/composition/container";
import { localize } from "@/core/domain/shared/locale";
import { formatMoney } from "@/core/domain/shared/money";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { Mark } from "@/ui/brand/Mark";
import { Marquee } from "@/ui/brand/Marquee";
import { OpenNow } from "@/ui/brand/OpenNow";
import { photos, productPhoto } from "@/ui/brand/photos";
import { Rail } from "@/ui/brand/Rail";
import { Wave } from "@/ui/brand/Wave";
import { Icon } from "@/ui/primitives/Icon";
import { cssVar, delay } from "@/ui/primitives/style";
import { cx } from "@/ui/primitives/cx";
import { pageMetadata } from "@/ui/seo/metadata";
import { SiteJsonLd } from "@/ui/seo/SiteJsonLd";

type Props = { params: Promise<{ locale: AppLocale }> };

const slogans = [
  "Your daily green ritual",
  "Good days start green",
  "Stay fresh. Stay green",
  "Take a green break",
  "Made for your everyday",
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return pageMetadata({ locale, href: "/", title: t("title"), description: t("description") });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, common, drinks, store] = await Promise.all([
    getTranslations("home"),
    getTranslations("common"),
    container().getMenu({ featuredOnly: true }),
    container().getStoreInfo(),
  ]);
  const steps = t.raw("steps") as { title: string; text: string }[];
  const captions = t.raw("captions") as string[];
  const alts = t.raw("alts") as string[];
  const weekday = store.schedule[1];
  const weekend = store.schedule[6];

  const mood = [
    { img: photos.takeaway, cls: "md:col-[1/6] md:row-span-4 col-span-2 row-span-2" },
    { img: photos.pour, cls: "md:col-[6/9] md:row-span-3 row-span-2" },
    { img: photos.slow, cls: "md:col-[9/13] md:row-span-3 row-span-2" },
    { img: photos.together, cls: "md:col-[6/13] md:row-span-2 col-span-2 row-span-2", pos: "object-[50%_62%]" },
  ];

  return (
    <>
      <SiteJsonLd locale={locale} description={t("description")} />
      <section className="hero relative grid min-h-svh overflow-hidden bg-[#d8d5ce] text-forest" data-hero aria-labelledby="hero-title">
        <div className="hero-zoom absolute inset-0 overflow-hidden" data-hero-media>
          <Image
            src={photos.hero}
            alt={t("heroAlt")}
            preload
            fetchPriority="high"
            fill
            sizes="100vw"
            quality={80}
            placeholder="blur"
            className="object-cover object-[50%_58%]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(243_239_231/.6)_0%,rgb(243_239_231/0)_36%),linear-gradient(0deg,rgb(243_239_231/.75)_0%,rgb(243_239_231/0)_32%)]" />
        </div>
        <div className="wrap relative z-10 grid grid-rows-[auto_auto_1fr_auto] gap-5 pt-[calc(var(--nav-h)+clamp(24px,6vh,64px))] pb-[clamp(24px,5vh,48px)] md:grid-rows-[auto_1fr_auto]">
          <span className="eyebrow hero-in" style={delay(0.1)}>
            {t("eyebrow")}
          </span>
          <h1 id="hero-title" className="display text-[clamp(2.4rem,12.4vw,5.2rem)] sm:text-[clamp(3.4rem,10.6vw,11.5rem)]">
            <span className="line-mask block" data-hero-line>
              <span className="line-in" style={delay(0.15)}>
                Good matcha<span className="text-matcha">.</span>
              </span>
            </span>{" "}
            <span className="line-mask block sm:text-right" data-hero-line>
              <span className="line-in" style={delay(0.3)}>
                Good mood<span className="text-matcha">.</span>
              </span>
            </span>
          </h1>
          <div className="flex flex-wrap items-end justify-between gap-6 self-end">
            <div className="hero-in" style={delay(0.55)}>
              <p className="mb-4 font-display text-[clamp(1.15rem,1.8vw,1.6rem)] leading-tight font-medium tracking-tight">
                Not just matcha.
                <br />
                It&apos;s a mood.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link className="btn grow xs:grow-0" href="/menu" data-magnetic>
                  {common("discoverMenu")}
                  <Icon name="arrow" />
                </Link>
                <Link className="btn btn--ghost grow xs:grow-0" href="/find-us" data-magnetic>
                  {t("cta2")}
                </Link>
              </div>
            </div>
            <span
              className="hero-in hidden items-center gap-3 text-xs font-medium tracking-[.2em] uppercase sm:inline-flex"
              style={delay(0.7)}
              aria-hidden="true"
            >
              <i className="relative h-[46px] w-[1.5px] overflow-hidden bg-forest/20 after:absolute after:inset-x-0 after:-top-[40%] after:h-[40%] after:[animation:drip_2.2s_cubic-bezier(.65,0,.35,1)_infinite] after:bg-forest" />
              {t("scroll")}
            </span>
          </div>
        </div>
      </section>

      <Marquee items={slogans} pauseLabel={common("pauseMarquee")} playLabel={common("playMarquee")} />

      <section className="section">
        <div className="wrap grid items-end gap-[clamp(32px,6vw,96px)] md:grid-cols-[1fr_minmax(260px,380px)]">
          <div>
            <span className="eyebrow" data-anim="fade">
              {t("introEyebrow")}
            </span>
            <p
              className="mt-6 max-w-[18ch] font-display text-[clamp(2rem,5.2vw,5rem)] leading-[1.04] font-semibold tracking-[-.035em] text-forest"
              data-anim=""
              data-words
            >
              {t("statement")}
            </p>
          </div>
          <div data-anim="fade">
            <p className="mb-6 text-ink-soft">{t("introP")}</p>
            <Link className="link-u text-forest" href="/story">
              {t("introLink")}
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </section>

      <Rail
        labelledBy="coll-title"
        label={t("collLabel")}
        prevLabel={common("prev")}
        nextLabel={common("next")}
        header={
          <>
            <div>
              <span className="eyebrow" data-anim="fade">
                {t("collEyebrow")}
              </span>
              <h2 id="coll-title" className="h-lg mt-4 text-forest" data-anim="lines">
                {t("collH")}
              </h2>
            </div>
            <p className="max-w-[38ch] text-ink-soft" data-anim="fade">
              {t("collP")}
            </p>
          </>
        }
        footer={
          <div className="coll-foot wrap mt-10 flex flex-wrap items-center justify-between gap-6">
            <Link className="btn" href="/menu" data-magnetic>
              {t("fullMenu")}
              <Icon name="arrow" />
            </Link>
            <span className="hidden h-[2px] w-[min(40vw,320px)] origin-left bg-forest/15 lg:block" aria-hidden="true">
              <span className="block h-full origin-left scale-x-0 bg-forest" data-hscroll-progress />
            </span>
          </div>
        }
      >
        {drinks.map((drink, i) => (
          <li key={drink.id} className="drink group grid gap-4">
            <Link href={{ pathname: "/menu/[slug]", params: { slug: drink.slug } }} className="grid gap-4">
              <div className="media media--zoom aspect-[4/5]">
                <Image
                  src={productPhoto(drink.imageKey)}
                  alt={localize(drink.alt, locale)}
                  sizes="(min-width: 64rem) 25vw, 78vw"
                  className="size-full object-cover"
                />
                <span
                  className="absolute top-3.5 left-3.5 rounded-full bg-paper/90 px-2.5 py-1.5 text-xs font-semibold tracking-[.14em] text-forest"
                  aria-hidden="true"
                >
                  0{i + 1}
                </span>
                <span className="cup-tag absolute right-3.5 bottom-3.5 inline-flex items-center gap-2 rounded-full bg-paper py-1.5 pr-3 pl-1.5 text-xs font-medium">
                  <i className="chip" style={cssVar("--c", drink.cupColor)} />
                  {localize(drink.cupName, locale)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="h-md text-charcoal">{drink.name}</h3>
                <span className="font-display font-medium whitespace-nowrap text-forest">{formatMoney(drink.price, locale)}</span>
              </div>
            </Link>
            <p className="drink__desc -mt-2 text-[.95rem] text-ink-soft">{localize(drink.shortDescription, locale)}</p>
          </li>
        ))}
      </Rail>

      <section className="section">
        <div className="wrap grid items-center gap-[clamp(32px,6vw,110px)] md:grid-cols-[1.05fr_1fr]">
          <div className="media relative aspect-[4/4.4] md:aspect-[4/5]" data-anim="clip">
            <div className="absolute inset-[-8%_0]" data-parallax="6">
              <Image src={photos.ritual} alt={t("ritualAlt")} fill sizes="(min-width: 48rem) 50vw, 100vw" className="object-cover" />
            </div>
            <div
              className="absolute bottom-4 left-4 grid size-[clamp(92px,10vw,120px)] place-items-center rounded-full bg-matcha text-forest"
              aria-hidden="true"
            >
              <svg className="size-full [animation:spin_18s_linear_infinite]" viewBox="0 0 240 240">
                <defs>
                  <path id="circ" d="M120 120m-88 0a88 88 0 1 1 176 0a88 88 0 1 1-176 0" />
                </defs>
                <text fontSize="22" fontWeight="600" letterSpacing="6.4" fill="currentColor" fontFamily="var(--font-dm-sans), sans-serif">
                  <textPath href="#circ">TAKE A GREEN BREAK · TAKE A GREEN BREAK ·</textPath>
                </text>
              </svg>
              <Mark className="absolute size-8" />
            </div>
          </div>
          <div>
            <span className="eyebrow" data-anim="fade">
              {t("ritualEyebrow")}
            </span>
            <h2 className="h-lg mt-4 text-forest" data-anim="lines">
              Your daily green ritual.
            </h2>
            <ol className="mt-9 mb-10 border-t border-line">
              {steps.map((step, i) => (
                <li key={step.title} className="grid grid-cols-[52px_1fr] gap-4 border-b border-line py-5" data-anim="fade">
                  <span className="pt-1 font-display text-sm font-medium text-forest" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="mb-1.5 text-xl font-semibold">{step.title}</h3>
                    <p className="text-[.97rem] text-ink-soft">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link className="link-u text-forest" href="/culture" data-anim="fade">
              {t("ritualLink")}
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </section>

      <Wave from="var(--color-paper)" to="var(--color-forest)" />

      <section className="on-dark bg-forest pt-[clamp(40px,6vw,80px)] pb-[clamp(80px,12vw,170px)] text-cream" aria-labelledby="visit-title">
        <div className="wrap grid items-center gap-[clamp(32px,6vw,100px)] md:grid-cols-[1fr_1.1fr]">
          <div>
            <span className="eyebrow" data-anim="fade">
              {t("findEyebrow")}
            </span>
            <h2 id="visit-title" className="h-xl mt-4" data-anim="lines">
              Take a <span className="text-matcha">green break.</span>
            </h2>
            <p className="lede mt-6" data-anim="fade">
              {t("visitP")}
            </p>
            <OpenNow schedule={store.schedule} timeZone={store.timeZone} />
            <dl className="mt-8 mb-10 border-t border-line-light" data-anim="fade">
              {weekday && (
                <div className="flex justify-between gap-4 border-b border-line-light py-4">
                  <dt className="text-sage">{common("weekdays")}</dt>
                  <dd className="font-display font-medium">
                    {weekday.opens} – {weekday.closes}
                  </dd>
                </div>
              )}
              {weekend && (
                <div className="flex justify-between gap-4 border-b border-line-light py-4">
                  <dt className="text-sage">{common("weekend")}</dt>
                  <dd className="font-display font-medium">
                    {weekend.opens} – {weekend.closes}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-b border-line-light py-4">
                <dt className="text-sage">{t("address")}</dt>
                <dd className="font-display font-medium">{store.address.street}</dd>
              </div>
            </dl>
            <Link className="btn btn--matcha" href="/find-us" data-magnetic>
              {t("directions")}
              <Icon name="arrow" />
            </Link>
          </div>
          <div className="media aspect-[4/4.4] md:aspect-[5/6]" data-anim="clip">
            <div className="absolute inset-[-8%_0]" data-parallax="6">
              <Image src={photos.scene} alt={t("sceneAlt")} fill sizes="(min-width: 48rem) 50vw, 100vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      <Wave from="var(--color-forest)" to="var(--color-paper)" />

      <section className="section pt-[clamp(48px,7vw,96px)]" aria-labelledby="mood-title">
        <div className="wrap">
          <div className="mb-[clamp(40px,6vw,80px)] flex flex-wrap items-end justify-between gap-8">
            <div>
              <span className="eyebrow" data-anim="fade">
                #MoriMood
              </span>
              <h2 id="mood-title" className="h-lg mt-4 max-w-[14ch] text-forest" data-anim="lines">
                Green looks good on you.
              </h2>
            </div>
            <p className="lede" data-anim="fade">
              {t("moodP")}
            </p>
          </div>
          <div className="grid auto-rows-[150px] grid-cols-2 gap-[clamp(10px,1.4vw,20px)] md:auto-rows-[clamp(90px,9vw,140px)] md:grid-cols-12">
            {mood.map((m, i) => (
              <figure key={captions[i]} className={`media group media--zoom ${m.cls}`} data-anim="clip" data-delay={String(i * 0.08)}>
                <Image src={m.img} alt={alts[i] ?? ""} fill sizes="(min-width: 48rem) 40vw, 100vw" className={cx("object-cover", m.pos)} />
                <figcaption className="absolute bottom-3 left-3 rounded-full bg-paper/90 px-3 py-1.5 text-[.78rem] font-medium text-forest">
                  {captions[i]}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
            <p className="text-ink-soft">
              {t("tag")} <strong className="text-forest">{store.instagram}</strong> {t("tagEnd")}
            </p>
            <a className="link-u text-forest" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">
              <Icon name="ig" size={18} />
              Instagram<span className="sr-only"> {common("newTab")}</span>
            </a>
          </div>
        </div>
      </section>

      <section className="on-dark section bg-forest text-center text-cream">
        <div className="wrap">
          <h2 className="display text-[clamp(3rem,10vw,9.5rem)]" data-anim="lines">
            Less ordinary.
            <br />
            <span className="text-matcha">More matcha.</span>
          </h2>
          <p className="mx-auto mt-6 mb-9 max-w-[40ch] text-sage" data-anim="fade">
            {t("ctaP")}
          </p>
          <Link className="btn btn--matcha" href="/menu" data-magnetic data-anim="fade">
            {common("discoverMenu")}
            <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </>
  );
}
