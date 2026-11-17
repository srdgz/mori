import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { checkout } from "@/composition/checkout";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Icon } from "@/ui/primitives/Icon";
import { OrderList } from "@/ui/shop/OrderList";
import { reorderAction } from "../../../order/actions";
import { accountMetadata } from "../../shared";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ before?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "orders");
}

function parseBefore(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function OrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const before = parseBefore((await searchParams).before);
  const [t, history] = await Promise.all([getTranslations("account.orders"), checkout().listOrders(before)]);
  const orders = history?.orders ?? [];

  return (
    <div className="grid gap-[clamp(28px,4vw,48px)]">
      <header>
        <h1 className="display text-[clamp(2.4rem,5vw,4.4rem)] text-forest">{t("title")}</h1>
        <p className="lede mt-4">{t("lede")}</p>
      </header>

      {orders.length === 0 ? (
        <section className="account-card grid justify-items-start gap-4">
          <p className="text-ink-soft">{t("empty")}</p>
          <Link href="/menu" className="btn">
            {t("emptyCta")}
            <Icon name="arrow" />
          </Link>
        </section>
      ) : (
        <OrderList orders={orders} locale={locale} reorderAction={reorderAction} />
      )}

      <nav className="flex flex-wrap gap-5" aria-label={t("title")}>
        {before && (
          <Link href="/account/orders" className="link-u text-forest">
            {t("newest")}
          </Link>
        )}
        {history?.next && (
          <Link href={{ pathname: "/account/orders", query: { before: history.next.toISOString() } }} className="link-u text-forest">
            {t("older")}
            <Icon name="arrow" size={16} />
          </Link>
        )}
      </nav>
    </div>
  );
}
