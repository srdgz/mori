import { getTranslations } from "next-intl/server";
import type { StoreInfo } from "@/core/domain/store/store-info";
import { Link } from "@/i18n/navigation";
import { legalItems, navItems } from "@/i18n/routing";
import { Icon } from "@/ui/primitives/Icon";
import { Mark, Wordmark } from "./Mark";

type Props = { store: StoreInfo };

export async function Footer({ store }: Props) {
  const t = await getTranslations("common");
  const nav = await getTranslations("nav");
  const legal = await getTranslations("legal");
  const weekday = store.schedule[1];
  const weekend = store.schedule[6];
  const year = new Date().getFullYear();

  return (
    <footer className="on-dark overflow-hidden bg-forest pt-[clamp(60px,9vw,120px)] pb-7 text-cream">
      <div className="wrap">
        <div className="grid gap-10 pb-[clamp(48px,7vw,90px)] sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="mb-8 inline-flex flex-col items-start gap-4 text-cream" aria-label={t("home")}>
              <Mark className="size-16" />
              <Wordmark className="h-6 w-auto" />
            </Link>
            <p className="mb-6 max-w-[14ch] font-display text-[clamp(1.6rem,2.8vw,2.4rem)] leading-[1.05] font-semibold tracking-tight">
              {t.rich("footClaim", { accent: (chunks) => <span className="text-matcha">{chunks}</span> })}
            </p>
            <ul className="flex gap-2.5" aria-label={t("footFollow")}>
              <li>
                <a className="social" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">
                  <Icon name="ig" size={18} />
                  <span className="sr-only">Instagram {t("newTab")}</span>
                </a>
              </li>
              <li>
                <a className="social" href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer">
                  <Icon name="tt" size={18} />
                  <span className="sr-only">TikTok {t("newTab")}</span>
                </a>
              </li>
              <li>
                <a className="social" href={`mailto:${store.email}`}>
                  <Icon name="mail" size={18} />
                  <span className="sr-only">{t("email")}</span>
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="foot-h">{t("footVisit")}</h2>
            <address className="grid gap-2 not-italic">
              <span>{store.address.street}</span>
              <span>
                {store.address.postalCode} {store.address.city}
              </span>
              <span>{t("metro")}</span>
            </address>
          </div>
          <div>
            <h2 className="foot-h">{t("footHours")}</h2>
            <ul className="grid gap-2">
              {weekday && (
                <li>
                  {t("weekdaysShort")} · {weekday.opens}–{weekday.closes}
                </li>
              )}
              {weekend && (
                <li>
                  {t("weekendShort")} · {weekend.opens}–{weekend.closes}
                </li>
              )}
            </ul>
          </div>
          <div>
            <h2 className="foot-h">{t("footExplore")}</h2>
            <ul className="grid gap-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link className="transition-colors hover:text-matcha" href={item.href}>
                    {nav(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footer-word mb-[clamp(24px,3vw,40px)]" aria-hidden="true" data-footer-word />
        <div className="flex flex-wrap justify-between gap-4 border-t border-line-light pt-5 text-[.82rem] text-sage">
          <span>
            © {year} {store.name}
          </span>
          <nav aria-label={t("legalNav")}>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {legalItems.map((item) => (
                <li key={item.href}>
                  <Link className="underline-offset-4 transition-colors hover:text-cream hover:underline" href={item.href}>
                    {legal(`nav.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <span>{t("note")}</span>
        </div>
      </div>
    </footer>
  );
}
