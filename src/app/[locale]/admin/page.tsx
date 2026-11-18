import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { admin } from "@/composition/checkout";
import { formatMoney, money } from "@/core/domain/shared/money";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "admin" });
  return { title: t("metaTitle", { page: t("nav.dashboard") }), robots: { index: false } };
}

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, data] = await Promise.all([getTranslations("admin.dashboard"), admin().getDashboard()]);
  if (!data) redirect({ href: "/admin/orders", locale });
  if (!data) return null;

  const euros = (cents: number) => formatMoney(money(cents), locale);
  const peak = Math.max(1, ...data.byHour.map((h) => h.totalCents));
  const topPeak = Math.max(1, ...data.top.map((p) => p.quantity));
  const split = data.week.pickup + data.week.delivery;
  const pickupShare = split > 0 ? Math.round((data.week.pickup / split) * 100) : 0;

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="display text-[clamp(2rem,4vw,3.2rem)] text-forest">{t("title")}</h1>
        <p className="lede mt-3">{t("lede")}</p>
      </header>

      <dl className="stat-grid">
        <div className="stat">
          <dt>{t("today")}</dt>
          <dd>{euros(data.today.totalCents)}</dd>
          <dd className="stat__note">{t("orders", { count: data.today.orders })}</dd>
        </div>
        <div className="stat">
          <dt>{t("week")}</dt>
          <dd>{euros(data.week.totalCents)}</dd>
          <dd className="stat__note">{t("orders", { count: data.week.orders })}</dd>
        </div>
        <div className="stat">
          <dt>{t("average")}</dt>
          <dd>{euros(data.averageCents)}</dd>
        </div>
        <div className="stat">
          <dt>{t("split")}</dt>
          <dd>{split > 0 ? `${pickupShare} % / ${100 - pickupShare} %` : "—"}</dd>
          <dd className="stat__note">
            {data.week.pickup} / {data.week.delivery}
          </dd>
        </div>
      </dl>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <section className="account-card grid content-start gap-4" aria-labelledby="hours-h">
          <h2 id="hours-h" className="font-semibold text-forest">
            {t("byHour")}
          </h2>
          {data.byHour.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("empty")}</p>
          ) : (
            <ol className="hour-chart">
              {data.byHour.map((h) => {
                const label = `${String(h.hour).padStart(2, "0")}:00`;
                return (
                  <li key={h.hour}>
                    <span className="sr-only">{t("byHourLabel", { hour: label, amount: euros(h.totalCents) })}</span>
                    <span
                      className="hour-chart__bar"
                      aria-hidden="true"
                      style={{ height: `${Math.max(2, Math.round((h.totalCents / peak) * 100))}%` }}
                    />
                    <span className="hour-chart__label" aria-hidden="true">
                      {h.hour}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="account-card grid content-start gap-4" aria-labelledby="top-h">
          <h2 id="top-h" className="font-semibold text-forest">
            {t("top")}
          </h2>
          {data.top.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("empty")}</p>
          ) : (
            <ol className="grid gap-3">
              {data.top.map((product) => (
                <li key={product.name} className="grid gap-1">
                  <span className="text-sm text-forest">{t("topItem", { name: product.name, count: product.quantity })}</span>
                  <span className="top-bar" aria-hidden="true">
                    <i style={{ width: `${Math.round((product.quantity / topPeak) * 100)}%` }} />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      <p className="text-xs text-ink-soft">{t("includesDemo")}</p>
    </div>
  );
}
