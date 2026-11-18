import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { admin } from "@/composition/checkout";
import { formatMoney, money } from "@/core/domain/shared/money";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Switch } from "@/ui/admin/ProductsClient";
import { CouponForm } from "@/ui/admin/StoreClient";
import { createCouponAction, setCouponActiveAction } from "../actions";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "admin" });
  return { title: t("metaTitle", { page: t("nav.coupons") }), robots: { index: false } };
}

export default async function CouponsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, messages, coupons] = await Promise.all([getTranslations("admin.coupons"), getMessages(), admin().listCoupons()]);
  if (!coupons) redirect({ href: "/admin/orders", locale });
  if (!coupons) return null;
  const date = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { dateStyle: "medium", timeZone: "Europe/Madrid" });

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="display text-[clamp(2rem,4vw,3.2rem)] text-forest">{t("title")}</h1>
        <p className="lede mt-3">{t("lede")}</p>
      </header>

      <NextIntlClientProvider messages={{ admin: { coupons: messages.admin.coupons } }}>
        <CouponForm create={createCouponAction} />
      </NextIntlClientProvider>

      {coupons.length === 0 ? (
        <p className="text-ink-soft">{t("empty")}</p>
      ) : (
        <ul className="grid gap-2">
          {coupons.map((coupon) => {
            const value = coupon.kind === "percent" ? `${coupon.value} %` : formatMoney(money(coupon.value), locale);
            const details = [
              t("off", { value }),
              coupon.minSubtotal.cents > 0 ? t("from", { amount: formatMoney(coupon.minSubtotal, locale) }) : null,
              coupon.firstOrderOnly ? t("firstOrder") : null,
              coupon.startsAt || coupon.endsAt
                ? `${coupon.startsAt ? date.format(coupon.startsAt) : "…"} – ${coupon.endsAt ? date.format(coupon.endsAt) : "…"}`
                : null,
            ].filter(Boolean);
            return (
              <li key={coupon.id} className="admin-row">
                <div className="grid min-w-0 flex-1">
                  <span className="font-semibold tracking-wide text-forest">{coupon.code}</span>
                  <span className="text-sm text-ink-soft">{details.join(" · ")}</span>
                </div>
                <span className="text-sm text-ink-soft">
                  {t("uses")}:{" "}
                  {coupon.maxUses ? t("limit", { used: coupon.uses, max: coupon.maxUses }) : t("unlimited", { used: coupon.uses })}
                </span>
                <Switch
                  checked={coupon.isActive}
                  label={`${coupon.code} ${t("active")}`}
                  onLabel={t("active")}
                  offLabel="—"
                  onChange={setCouponActiveAction.bind(null, coupon.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
