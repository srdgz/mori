import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { container } from "@/composition/container";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { OpenNow } from "@/ui/brand/OpenNow";
import { PageHero } from "@/ui/brand/PageHero";
import { photos } from "@/ui/brand/photos";
import { WeekHours } from "@/ui/brand/WeekHours";
import { Icon, type IconName } from "@/ui/primitives/Icon";
import { pageMetadata } from "@/ui/seo/metadata";

type Props = { params: Promise<{ locale: AppLocale }> };

type HowTo = { mode: string; text: string };
type Feature = { icon: IconName; title: string; text: string };

const mapsUrl = "https://www.google.com/maps/search/?api=1&query=Calle+del+Esp%C3%ADritu+Santo+18+Madrid";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "findUs" });
  return pageMetadata({ locale, href: "/find-us", title: t("title"), description: t("description") });
}

export default async function FindUsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, common, store] = await Promise.all([getTranslations("findUs"), getTranslations("common"), container().getStoreInfo()]);
  const howTo = t.raw("how") as HowTo[];
  const features = t.raw("feats") as Feature[];

  return (
    <>
      <PageHero index="04" eyebrow={t("eyebrow")} lines={t.raw("heroLines") as string[]} lede={t("lede")} />

      <section className="pb-[clamp(80px,12vw,170px)]">
        <div className="wrap grid items-start gap-[clamp(28px,5vw,80px)] lg:grid-cols-[1.2fr_1fr]">
          <figure className="map relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-forest" data-anim="clip">
            <svg viewBox="0 0 600 600" className="block size-full" role="img" aria-label={t("mapLabel")}>
              <g className="blocks">
                <rect x="40" y="40" width="150" height="120" rx="8" />
                <rect x="230" y="40" width="120" height="120" rx="8" />
                <rect x="390" y="40" width="170" height="90" rx="8" />
                <rect x="40" y="200" width="150" height="130" rx="8" />
                <rect x="390" y="170" width="170" height="160" rx="8" />
                <rect x="40" y="370" width="110" height="190" rx="8" />
                <rect x="190" y="370" width="160" height="80" rx="8" />
                <rect x="190" y="490" width="160" height="70" rx="8" />
                <rect x="390" y="370" width="170" height="190" rx="8" />
              </g>
              <rect className="park" x="230" y="200" width="120" height="130" rx="10" />
              <g className="streets">
                <path className="main" d="M210 0V600" />
                <path d="M0 180H600" />
                <path className="main" d="M0 350H600" />
                <path d="M370 0V600" />
                <path d="M170 360V600" />
                <path d="M0 470H380" />
              </g>
              <text x="250" y="270">
                Dos de Mayo
              </text>
              <text x="420" y="345">
                C/ Espíritu Santo
              </text>
              <text x="222" y="590" transform="rotate(-90 222 590)">
                C/ San Bernardo
              </text>
              <text x="20" y="172">
                C/ Velarde
              </text>
              <g className="metro">
                <circle cx="210" cy="455" r="16" />
                <text x="203" y="460">
                  M
                </text>
                <circle cx="530" cy="560" r="16" />
                <text x="523" y="565">
                  M
                </text>
              </g>
              <text x="232" y="520">
                Noviciado
              </text>
              <text x="470" y="535">
                Tribunal
              </text>
            </svg>
            <div
              className="pin pointer-events-none absolute top-[59%] left-[62%] grid -translate-x-1/2 -translate-y-full justify-items-center"
              aria-hidden="true"
            >
              <span className="rounded-full bg-matcha py-2.5 pr-4 pl-[18px] font-display text-sm font-bold tracking-[.2em] whitespace-nowrap text-forest shadow-[0_10px_30px_rgb(0_0_0/.25)]">
                MŌRI
              </span>
              <span className="h-[30px] w-0.5 bg-matcha" />
              <span className="pin__dot relative size-3.5 rounded-full bg-matcha" />
            </div>
          </figure>

          <div>
            <div className="info-block" data-anim="fade">
              <h2 className="info-h">{t("addrH")}</h2>
              <address className="font-display text-[clamp(1.25rem,2vw,1.6rem)] leading-tight tracking-tight text-forest not-italic">
                {store.address.street}
                <br />
                {store.address.postalCode} {store.address.city}
              </address>
              <p className="mt-2 text-[.95rem] text-ink-soft">{t("addrSmall")}</p>
              <a className="link-u mt-4 text-forest" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <Icon name="pin" size={16} />
                {t("maps")}
                <span className="sr-only"> {common("newTab")}</span>
              </a>
            </div>
            <div className="info-block" data-anim="fade">
              <h2 className="info-h">{t("hoursH")}</h2>
              <WeekHours
                schedule={store.schedule}
                timeZone={store.timeZone}
                dayNames={t.raw("days") as string[]}
                closedLabel={common("closed")}
              />
              <OpenNow schedule={store.schedule} timeZone={store.timeZone} tone="light" />
            </div>
            <div className="info-block" data-anim="fade">
              <h2 className="info-h">{t("howH")}</h2>
              <ul className="grid gap-2">
                {howTo.map((item) => (
                  <li key={item.text} className="flex gap-3 text-ink-soft">
                    <span className="w-12 flex-none font-medium text-forest">{item.mode}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-cream" aria-labelledby="feat-h">
        <div className="wrap">
          <h2 id="feat-h" className="h-lg mb-[clamp(32px,5vw,56px)] text-forest" data-anim="lines">
            {t("featK")}
          </h2>
          <ul className="grid gap-[clamp(14px,2vw,24px)] md:grid-cols-3">
            {features.map((feature) => (
              <li key={feature.title} className="rounded-[var(--radius-card)] bg-paper p-[clamp(22px,3vw,34px)]" data-anim="fade">
                <Icon name={feature.icon} size={40} className="mb-6 text-forest" />
                <h3 className="mb-2 text-[1.35rem] font-semibold text-forest">{feature.title}</h3>
                <p className="text-[.96rem] text-ink-soft">{feature.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="wrap grid items-center gap-[clamp(32px,6vw,100px)] md:grid-cols-2">
          <div className="media aspect-[4/4.4]" data-anim="clip">
            <div className="absolute inset-[-8%_0]" data-parallax="6">
              <Image src={photos.slow} alt={t("slowAlt")} fill sizes="(min-width: 48rem) 50vw, 100vw" className="object-cover" />
            </div>
          </div>
          <div>
            <h2 className="h-lg text-forest" data-anim="lines">
              {t("groupH")}
            </h2>
            <p className="lede mt-5 mb-9" data-anim="fade">
              {t("groupP")}
            </p>
            <Link className="btn" href="/contact" data-magnetic data-anim="fade">
              {t("groupCta")}
              <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
