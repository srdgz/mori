import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { admin } from "@/composition/checkout";
import { formatMoney, money } from "@/core/domain/shared/money";
import { Link, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "admin" });
  return { title: t("metaTitle", { page: t("nav.customers") }), robots: { index: false } };
}

export default async function CustomersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q = "", page = "0" } = await searchParams;
  const current = Math.max(0, Number.parseInt(page, 10) || 0);
  const [t, result] = await Promise.all([getTranslations("admin.customers"), admin().listCustomers(q, current)]);
  if (!result) redirect({ href: "/admin/orders", locale });
  if (!result) return null;
  const date = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { dateStyle: "medium", timeZone: "Europe/Madrid" });

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="display text-[clamp(2rem,4vw,3.2rem)] text-forest">{t("title")}</h1>
        <p className="lede mt-3">{t("lede")}</p>
      </header>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <label className="field max-w-[420px] flex-1">
          <span className="field-label">{t("search")}</span>
          <input type="search" name="q" defaultValue={q} />
        </label>
        <button type="submit" className="btn btn--ghost btn--small">
          {t("search")}
        </button>
      </form>

      {result.customers.length === 0 ? (
        <p className="text-ink-soft">{t("empty")}</p>
      ) : (
        <div className="admin-table-wrap" role="region" aria-label={t("title")} tabIndex={0}>
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t("name")}</th>
                <th scope="col">{t("email")}</th>
                <th scope="col">{t("since")}</th>
                <th scope="col" className="num">
                  {t("orders")}
                </th>
                <th scope="col" className="num">
                  {t("spent")}
                </th>
                <th scope="col">{t("lastOrder")}</th>
              </tr>
            </thead>
            <tbody>
              {result.customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.email}</td>
                  <td>{date.format(customer.createdAt)}</td>
                  <td className="num">{customer.orders}</td>
                  <td className="num">{formatMoney(money(customer.spentCents), locale)}</td>
                  <td>{customer.lastOrderAt ? date.format(customer.lastOrderAt) : t("never")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.hasMore && (
        <Link href={{ pathname: "/admin/customers", query: { q, page: String(current + 1) } }} className="link-u w-fit text-forest">
          {t("older")}
        </Link>
      )}
    </div>
  );
}
