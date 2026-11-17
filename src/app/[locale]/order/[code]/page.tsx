import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { checkout } from "@/composition/checkout";
import { account } from "@/composition/container";
import { localize } from "@/core/domain/shared/locale";
import { formatMoney } from "@/core/domain/shared/money";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Icon } from "@/ui/primitives/Icon";
import { ClearCartFor, RefreshWhilePending } from "@/ui/shop/OrderClient";

type Props = {
  params: Promise<{ locale: AppLocale; code: string }>;
  searchParams: Promise<{ t?: string; redirect_status?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: "shop.order" });
  return { title: `${t("title", { code: code.toUpperCase() })} — MŌRI Matcha Bar & Culture`, robots: { index: false } };
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const { t: token, redirect_status: redirectStatus } = await searchParams;
  const [t, order, { user }] = await Promise.all([
    getTranslations("shop.order"),
    checkout().getOrder(code, token ?? null),
    account().currentActor(),
  ]);

  if (!order) {
    return (
      <section className="pt-[calc(var(--nav-h)+clamp(24px,5vw,64px))] pb-[clamp(64px,9vw,128px)]">
        <div className="wrap grid max-w-[720px] justify-items-start gap-4">
          <h1 className="display text-[clamp(2.4rem,5vw,4rem)] text-forest">{t("notFoundTitle")}</h1>
          <p className="lede">{t("notFoundText")}</p>
          <Link href="/menu" className="btn mt-4">
            {t("backToMenu")}
            <Icon name="arrow" />
          </Link>
        </div>
      </section>
    );
  }

  const pending = order.status === "pending_payment";
  const dateLocale = locale === "es" ? "es-ES" : "en-GB";
  const when = order.slotStart
    ? {
        date: new Intl.DateTimeFormat(dateLocale, { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" }).format(
          order.slotStart,
        ),
        time: new Intl.DateTimeFormat(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(
          order.slotStart,
        ),
      }
    : null;
  const address = order.deliveryAddress ? `${order.deliveryAddress.line1}, ${order.deliveryAddress.postalCode}` : "";

  return (
    <section className="pt-[calc(var(--nav-h)+clamp(24px,5vw,64px))] pb-[clamp(64px,9vw,128px)]">
      {(redirectStatus === "succeeded" || !pending) && <ClearCartFor code={order.code} />}
      {pending && redirectStatus !== "failed" && <RefreshWhilePending />}
      <div className="wrap grid max-w-[880px] gap-[clamp(24px,4vw,40px)]">
        {pending ? (
          <header className="grid gap-4" role="status">
            <span className="spinner text-forest" aria-hidden="true" />
            <h1 className="display text-[clamp(2.4rem,5vw,4rem)] text-forest">{t("processingTitle")}</h1>
            <p className="lede">{t("processingText")}</p>
          </header>
        ) : order.status === "expired" ? (
          <header className="grid gap-4">
            <h1 className="display text-[clamp(2.4rem,5vw,4rem)] text-forest">{t("title", { code: order.code })}</h1>
            <p className="lede">{t("expiredText")}</p>
          </header>
        ) : (
          <header className="grid gap-5">
            <h1 className="display text-[clamp(2.4rem,5vw,4.4rem)] text-forest">{t("confirmedTitle")}</h1>
            <p className="lede">{order.fulfilment === "pickup" && when ? t("pickupText", when) : t("deliveryText", { address })}</p>
            <p className="order-code" aria-label={t("title", { code: order.code })}>
              {order.code}
            </p>
            <p className="text-ink-soft">{t("emailSent", { email: order.contactEmail })}</p>
            <p className="text-sm text-ink-soft">{t("trackingSoon")}</p>
          </header>
        )}

        <section className="account-card grid gap-4" aria-labelledby="order-items-h">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="order-items-h" className="font-semibold text-forest">
              {t("items")}
            </h2>
            <p className="tag">
              {t("statusLabel")}: {t(`status.${order.status}`)}
            </p>
          </div>
          <ul className="grid gap-3">
            {order.lines.map((line) => (
              <li key={`${line.productId}-${line.total.cents}-${line.quantity}`} className="flex justify-between gap-4">
                <div>
                  <p className="font-semibold text-forest">
                    {line.quantity} × {line.productName}
                  </p>
                  <p className="text-sm text-ink-soft">{line.options.map((o) => localize(o.name, locale)).join(" · ")}</p>
                </div>
                <p className="whitespace-nowrap text-forest">{formatMoney(line.total, locale)}</p>
              </li>
            ))}
          </ul>
          <dl className="totals">
            {order.discount.cents > 0 && (
              <div>
                <dt>−</dt>
                <dd>−{formatMoney(order.discount, locale)}</dd>
              </div>
            )}
            {order.deliveryFee.cents > 0 && (
              <div>
                <dt>+</dt>
                <dd>{formatMoney(order.deliveryFee, locale)}</dd>
              </div>
            )}
            <div className="totals__total">
              <dt>Total</dt>
              <dd>{formatMoney(order.total, locale)}</dd>
            </div>
          </dl>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/menu" className="btn btn--ghost">
            {t("backToMenu")}
          </Link>
          {!user && !pending && (
            <Link href="/account/sign-up" className="btn">
              {t("createAccount", { email: order.contactEmail })}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
