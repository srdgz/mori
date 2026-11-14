import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { PageHero } from "@/ui/brand/PageHero";
import { photos } from "@/ui/brand/photos";
import { Wave } from "@/ui/brand/Wave";
import { Icon } from "@/ui/primitives/Icon";
import { cx } from "@/ui/primitives/cx";
import { pageMetadata } from "@/ui/seo/metadata";

type Props = { params: Promise<{ locale: AppLocale }> };

type Fact = { value: string; unit: string; text: string };
type Step = { title: string; text: string; alt: string };
type Grade = { name: string; sub: string; items: string[] };
type Term = { term: string; jp: string; text: string };

const stepPhotos = [photos.powder, photos.preparation, photos.ritual, photos.pour];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "culture" });
  return pageMetadata({ locale, href: "/culture", title: t("title"), description: t("description") });
}

export default async function CulturePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("culture");
  const what = t.raw("what") as string[];
  const facts = t.raw("facts") as Fact[];
  const steps = t.raw("steps") as Step[];
  const grades = t.raw("grades") as Grade[];
  const glossary = t.raw("gloss") as Term[];

  return (
    <>
      <PageHero index="03" eyebrow={t("eyebrow")} lines={t.raw("heroLines") as string[]} lede={t("lede")} kanji="抹茶" />

      <section className="pb-[clamp(80px,12vw,170px)]">
        <div className="wrap grid items-center gap-[clamp(32px,6vw,100px)] md:grid-cols-[1fr_1.1fr]">
          <div>
            <span className="eyebrow" data-anim="fade">
              {t("whatK")}
            </span>
            <h2 className="h-lg mt-4 text-forest" data-anim="lines">
              {t("whatH")}
            </h2>
            {what.map((p) => (
              <p key={p} className="lede mt-6" data-anim="fade">
                {p}
              </p>
            ))}
          </div>
          <div className="media aspect-[4/4.4] md:aspect-[5/6]" data-anim="clip">
            <div className="absolute inset-[-8%_0]" data-parallax="6">
              <Image
                src={photos.ingredients}
                alt={t("ingredientsAlt")}
                fill
                sizes="(min-width: 48rem) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <Wave from="var(--color-paper)" to="var(--color-forest)" />

      <section className="on-dark bg-forest pt-[clamp(40px,6vw,80px)] pb-[clamp(80px,12vw,170px)] text-cream" aria-labelledby="facts-h">
        <div className="wrap">
          <h2 id="facts-h" className="eyebrow mb-10" data-anim="fade">
            {t("factsK")}
          </h2>
          <dl className="grid border-t border-line-light sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.unit} className="fact" data-anim="fade">
                <dt className="font-display text-[clamp(3rem,6.5vw,6rem)] leading-none font-semibold tracking-[-.05em] text-matcha">
                  <span data-count={fact.value}>{fact.value}</span>
                  <span className="ml-1 text-[.38em] tracking-normal">{fact.unit}</span>
                </dt>
                <dd className="mt-3.5 max-w-[24ch] text-[.95rem] text-sage">{fact.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Wave from="var(--color-forest)" to="var(--color-paper)" />

      <section className="section pt-[clamp(48px,7vw,96px)]" aria-labelledby="how-h">
        <div className="wrap">
          <span className="eyebrow" data-anim="fade">
            {t("howK")}
          </span>
          <h2 id="how-h" className="h-lg mt-4 mb-[clamp(36px,5vw,64px)] text-forest" data-anim="lines">
            {t("howH")}
          </h2>
          <ol className="grid gap-x-[clamp(14px,2vw,24px)] gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li key={step.title} className="group" data-anim="fade">
                <div className="media media--zoom mb-4.5 aspect-[4/5]">
                  <Image
                    src={stepPhotos[i] ?? photos.powder}
                    alt={step.alt}
                    sizes="(min-width: 64rem) 25vw, (min-width: 40rem) 50vw, 100vw"
                    className="size-full object-cover"
                  />
                  <span
                    className="absolute top-3 left-3 rounded-full bg-matcha px-2.5 py-1.5 font-display text-sm font-semibold text-forest"
                    aria-hidden="true"
                  >
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mb-2 text-[1.35rem] font-semibold text-forest">{step.title}</h3>
                <p className="text-[.96rem] text-ink-soft">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section bg-cream" aria-labelledby="grades-h">
        <div className="wrap">
          <span className="eyebrow" data-anim="fade">
            {t("gradesK")}
          </span>
          <h2 id="grades-h" className="h-lg mt-4 mb-[clamp(36px,5vw,64px)] text-forest" data-anim="lines">
            {t("gradesH")}
          </h2>
          <div className="grid gap-[clamp(14px,2vw,24px)] md:grid-cols-2">
            {grades.map((grade, i) => {
              const featured = i === 0;
              return (
                <article
                  key={grade.name}
                  className={cx(
                    "rounded-[var(--radius-card)] p-[clamp(24px,3.4vw,44px)]",
                    featured ? "on-dark bg-forest text-cream" : "bg-paper",
                  )}
                  data-anim="fade"
                >
                  {featured && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-matcha px-3 py-1 text-xs font-semibold text-forest">
                      <Icon name="check" size={14} />
                      MŌRI
                    </span>
                  )}
                  <h3 className="mt-3.5 mb-2 font-display text-[clamp(1.6rem,2.6vw,2.3rem)] font-semibold">{grade.name}</h3>
                  <p className={featured ? "text-sage" : "text-ink-soft"}>{grade.sub}</p>
                  <ul className="mt-5">
                    {grade.items.map((item) => (
                      <li
                        key={item}
                        className={cx(
                          "border-t py-2.5 text-[.96rem]",
                          featured ? "border-line-light text-sage" : "border-line text-ink-soft",
                        )}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="gloss-h">
        <div className="wrap">
          <span className="eyebrow" data-anim="fade">
            {t("glossK")}
          </span>
          <h2 id="gloss-h" className="h-lg mt-4 mb-[clamp(36px,5vw,64px)] max-w-[16ch] text-forest" data-anim="lines">
            {t("glossH")}
          </h2>
          <div className="grid gap-x-[clamp(24px,5vw,80px)] md:grid-cols-2">
            {glossary.map((entry) => (
              <details key={entry.term} className="term border-t border-line" data-anim="fade">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5.5 font-display text-[clamp(1.3rem,2vw,1.8rem)] font-semibold tracking-tight text-forest">
                  <span>
                    {entry.term}{" "}
                    <span lang="ja" className="ml-2.5 font-sans text-[.9rem] font-normal tracking-normal text-ink-soft">
                      {entry.jp}
                    </span>
                  </span>
                  <i className="term__icon" aria-hidden="true" />
                </summary>
                <p className="mb-6 max-w-[52ch] text-ink-soft">{entry.text}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="on-dark section bg-forest text-center text-cream">
        <div className="wrap">
          <h2 className="h-xl mx-auto max-w-[16ch]" data-anim="lines">
            {t("ctaH")}
          </h2>
          <Link className="btn btn--matcha mt-10" href="/menu" data-magnetic data-anim="fade">
            {t("cta")}
            <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </>
  );
}
