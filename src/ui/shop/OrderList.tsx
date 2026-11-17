import { getTranslations } from "next-intl/server";
import type { OrderSummary } from "@/core/application/ports/checkout";
import type { Reorder } from "@/core/domain/ordering/reorder";
import { isFinal } from "@/core/domain/ordering/order-status";
import type { Locale } from "@/core/domain/shared/locale";
import { formatMoney } from "@/core/domain/shared/money";
import { Link } from "@/i18n/navigation";
import { cx } from "@/ui/primitives/cx";
import { ReorderButton } from "./OrderClient";

type Props = {
  orders: readonly OrderSummary[];
  locale: Locale;
  reorderAction: (code: string, token: string | null) => Promise<Reorder | null>;
};

export function isInProgress(order: Pick<OrderSummary, "status">): boolean {
  return !isFinal(order.status) && order.status !== "expired";
}

export async function OrderCard({
  order,
  locale,
  reorderAction,
  highlight = false,
}: Omit<Props, "orders"> & { order: OrderSummary; highlight?: boolean }) {
  const [t, s] = await Promise.all([getTranslations("account.orders"), getTranslations("shop.order")]);
  const dateLocale = locale === "es" ? "es-ES" : "en-GB";
  const date = new Intl.DateTimeFormat(dateLocale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(order.slotStart ?? order.createdAt);
  const href = { pathname: "/account/orders/[code]" as const, params: { code: order.code } };
  return (
    <article className={cx("order-card", highlight && "order-card--current")} aria-labelledby={`order-${order.code}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 id={`order-${order.code}`} className="font-semibold tracking-wide text-forest">
          <Link href={href} className="link-u">
            {order.code}
          </Link>
        </h3>
        <p className={cx("tag", isInProgress(order) && "tag--live")}>{s(`status.${order.status}`)}</p>
      </div>
      <p className="text-sm text-ink-soft">
        {t("summary", { date, fulfilment: t(order.fulfilment), count: order.items, total: formatMoney(order.total, locale) })}
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <Link href={href} className={cx("btn", highlight ? "btn--matcha" : "btn--ghost", "btn--small")}>
          {isInProgress(order) ? t("track") : t("details")}
        </Link>
        <ReorderButton
          action={reorderAction}
          code={order.code}
          token={null}
          className="btn btn--ghost btn--small"
          labels={{
            idle: s("reorder"),
            pending: s("reorderPending"),
            added: s("reorder"),
            skipped: s.raw("reorderSkipped") as string,
            none: s("reorderNone"),
          }}
        />
      </div>
    </article>
  );
}

export async function OrderList({ orders, locale, reorderAction }: Props) {
  return (
    <ul className="grid gap-4">
      {orders.map((order) => (
        <li key={order.code}>
          <OrderCard order={order} locale={locale} reorderAction={reorderAction} highlight={isInProgress(order)} />
        </li>
      ))}
    </ul>
  );
}
