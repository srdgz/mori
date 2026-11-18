import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { admin } from "@/composition/checkout";
import { localize } from "@/core/domain/shared/locale";
import { formatMoney } from "@/core/domain/shared/money";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { AdvanceButton, ConfirmActionButton, PrintButton } from "@/ui/admin/BoardClient";
import { Icon } from "@/ui/primitives/Icon";
import { advanceOrderAction, cancelOrderAction, refundOrderAction } from "../../actions";

type Props = { params: Promise<{ locale: AppLocale; code: string }> };

const TIME_ZONE = "Europe/Madrid";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("metaTitle", { page: code.toUpperCase() }), robots: { index: false } };
}

export default async function StaffOrderPage({ params }: Props) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const [t, s, d, view] = await Promise.all([
    getTranslations("admin.order"),
    getTranslations("shop.order"),
    getTranslations("admin.demo"),
    admin().getStaffOrder(code),
  ]);
  if (!view) notFound();

  const { order, timeline, next } = view;
  const dateLocale = locale === "es" ? "es-ES" : "en-GB";
  const clock = new Intl.DateTimeFormat(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
  const date = new Intl.DateTimeFormat(dateLocale, { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE });
  const stamp = new Intl.DateTimeFormat(dateLocale, { dateStyle: "short", timeStyle: "short", timeZone: TIME_ZONE });
  const address = order.deliveryAddress
    ? [order.deliveryAddress.line1, order.deliveryAddress.line2, `${order.deliveryAddress.postalCode} ${order.deliveryAddress.city}`]
        .filter(Boolean)
        .join(", ")
    : "";
  const fulfilment =
    order.fulfilment === "pickup" && order.slotStart
      ? t("pickupAt", { date: date.format(order.slotStart), time: clock.format(order.slotStart) })
      : t("deliveryTo", { address });
  const errors = {
    forbidden: t("errors.forbidden"),
    not_found: t("errors.not_found"),
    invalid_transition: t("errors.invalid_transition"),
    invalid_input: t("errors.not_found"),
  };

  return (
    <div className="grid gap-6">
      <Link href="/admin/orders" className="link-u no-print w-fit text-sm text-forest">
        <Icon name="left" size={16} />
        {t("back")}
      </Link>

      <header className="no-print flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <h1 className="display text-[clamp(2rem,4vw,3.2rem)] text-forest">{order.code}</h1>
          <p className="tag w-fit">{s(`status.${order.status}`)}</p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {next && view.canAdvance && (
            <AdvanceButton
              action={advanceOrderAction}
              code={order.code}
              next={next}
              label={t("advance", { status: s(`status.${next}`) })}
              failed={t("errors.invalid_transition")}
              className="btn btn--small"
            />
          )}
          <PrintButton label={t("print")} />
          {view.canCancel && (
            <ConfirmActionButton
              action={cancelOrderAction}
              code={order.code}
              label={t("cancel")}
              confirm={t("cancelConfirm", { code: order.code })}
              errors={errors}
              done={t("done")}
            />
          )}
          {view.canRefund && (
            <ConfirmActionButton
              action={refundOrderAction}
              code={order.code}
              label={t("refund")}
              confirm={t("refundConfirm", { code: order.code })}
              errors={errors}
              done={t("done")}
            />
          )}
        </div>
      </header>

      {!view.canAdvance && next && <p className="form-note no-print w-fit">{d("readOnly")}</p>}

      <div className="no-print grid gap-5 lg:grid-cols-2">
        <section className="account-card grid content-start gap-2" aria-labelledby="customer-h">
          <h2 id="customer-h" className="font-semibold text-forest">
            {t("customer")}
          </h2>
          <p className="text-forest">{order.contactName}</p>
          <p className="text-sm text-ink-soft">
            {order.contactEmail} · {order.contactPhone}
          </p>
          <h2 className="mt-3 font-semibold text-forest">{t("fulfilment")}</h2>
          <p className="text-sm text-ink-soft">{fulfilment}</p>
          <h2 className="mt-3 font-semibold text-forest">{t("notes")}</h2>
          <p className="text-sm text-ink-soft">{order.notes ?? t("noNotes")}</p>
          <h2 className="mt-3 font-semibold text-forest">{t("payment")}</h2>
          <p className="text-sm text-ink-soft">{order.paymentIntentId && !order.isDemo ? t("paid") : t("demoPayment")}</p>
          {order.refunded.cents > 0 && (
            <p className="text-sm text-ink-soft">{t("refunded", { amount: formatMoney(order.refunded, locale) })}</p>
          )}
        </section>

        <section className="account-card grid content-start gap-3" aria-labelledby="history-h">
          <h2 id="history-h" className="font-semibold text-forest">
            {t("history")}
          </h2>
          <ol className="grid gap-2">
            {order.events.map((event, index) => (
              <li key={`${event.status}-${index}`} className="flex justify-between gap-4 text-sm">
                <span className="text-forest">{s(`status.${event.status}`)}</span>
                <span className="text-ink-soft">{stamp.format(event.at)}</span>
              </li>
            ))}
          </ol>
          {timeline.ended && <p className="text-sm text-ink-soft">{s(`status.${timeline.ended}`)}</p>}
        </section>
      </div>

      <section className="account-card no-print grid gap-4" aria-labelledby="items-h">
        <h2 id="items-h" className="font-semibold text-forest">
          {t("items")}
        </h2>
        <ul className="grid gap-3">
          {order.lines.map((line, index) => (
            <li key={`${line.productId}-${index}`} className="flex justify-between gap-4">
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

      <div className="ticket" aria-hidden="true">
        <p className="ticket__title">{t("ticket.title")}</p>
        <p>{t("ticket.address")}</p>
        <p className="ticket__code">{order.code}</p>
        <p>{stamp.format(order.createdAt)}</p>
        <p>{fulfilment}</p>
        <hr />
        {order.lines.map((line, index) => (
          <div key={`t-${index}`} className="ticket__line">
            <p>
              {line.quantity} × {line.productName}
            </p>
            <p>{formatMoney(line.total, locale)}</p>
            {line.options.length > 0 && <p className="ticket__options">{line.options.map((o) => localize(o.name, locale)).join(", ")}</p>}
          </div>
        ))}
        {order.notes && <p className="ticket__note">{order.notes}</p>}
        <hr />
        <div className="ticket__line ticket__total">
          <p>Total</p>
          <p>{formatMoney(order.total, locale)}</p>
        </div>
        <p>{t("ticket.vat", { amount: formatMoney(order.vat, locale) })}</p>
        <p className="ticket__title">{t("ticket.thanks")}</p>
      </div>
    </div>
  );
}
