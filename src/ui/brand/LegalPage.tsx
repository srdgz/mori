import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { Icon } from "@/ui/primitives/Icon";

export type LegalDoc = "legalNotice" | "privacy" | "cookies" | "terms";

type Section = { title: string; body: string[] };

export async function LegalPage({ doc, locale }: { doc: LegalDoc; locale: AppLocale }) {
  const t = await getTranslations("legal");
  const sections = t.raw(`${doc}.sections`) as Section[];
  const date = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${t("updatedOn")}T12:00:00Z`),
  );

  return (
    <article className="legal pt-[calc(var(--nav-h)+clamp(40px,7vw,96px))] pb-[clamp(80px,12vw,160px)]">
      <div className="wrap">
        <header className="max-w-[60rem]">
          <span className="eyebrow text-forest">{t("eyebrow")}</span>
          <h1 className="display mt-4 text-[clamp(2.6rem,7vw,5.6rem)] text-forest">{t(`${doc}.title`)}</h1>
          <p className="legal__notice mt-8">
            <Icon name="info" size={20} />
            <span>{t("notice")}</span>
          </p>
        </header>
        <div className="legal__grid mt-[clamp(40px,6vw,72px)]">
          <nav className="legal__toc" aria-labelledby="legal-toc">
            <h2 id="legal-toc" className="legal__toc-h">
              {t("toc")}
            </h2>
            <ol>
              {sections.map((section, index) => (
                <li key={section.title}>
                  <a href={`#s-${index + 1}`} className="link-u">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="legal__body">
            {sections.map((section, index) => (
              <section key={section.title} id={`s-${index + 1}`} aria-labelledby={`s-${index + 1}-h`}>
                <h2 id={`s-${index + 1}-h`}>
                  <span aria-hidden="true">{index + 1}.</span> {section.title}
                </h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
            <p className="legal__updated">{t("updated", { date })}</p>
            <p className="legal__updated">{t("owner")}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
