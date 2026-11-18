import { getTranslations } from "next-intl/server";
import type { OrderTracking } from "@/core/application/checkout/tracking";
import type { Reorder } from "@/core/domain/ordering/reorder";
import { localize, type Locale } from "@/core/domain/shared/locale";
import { formatMoney } from "@/core/domain/shared/money";
import { getPathname, Link } from "@/i18n/navigation";
import { Icon } from "@/ui/primitives/Icon";
import { cx } from "@/ui/primitives/cx";
import { LiveOrder, NotifyButton, ReorderButton } from "./OrderClient";

const TIME_ZONE = "Europe/Madrid";

type Props = {
  tracking: OrderTracking;
  locale: Locale;
  token: string | null;
  signedIn: boolean;
  reorderAction: (code: string, token: string | null) => Promise<Reorder | null>;
  claimAction: (formData: FormData) => Promise<void>;
  notice?: string | null;
  realtime?: boolean;
};

export async function OrderDetails({ tracking, locale, token, signedIn, reorderAction, claimAction, notice, realtime = false }: Props) {
  const t = await getTranslations("shop.order");
  const { order, timeline } = tracking;
  const dateLocale = locale === "es" ? "es-ES" : "en-GB";
  const clock = new Intl.DateTimeFormat(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
  const pending = order.status === "pending_payment";
  const when = order.slotStart
    ? {
        date: new Intl.DateTimeFormat(dateLocale, { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE }).format(
          order.slotStart,
        ),
        time: clock.format(order.slotStart),
      }
    : null;
  const address = order.deliveryAddress ? `${order.deliveryAddress.line1}, ${order.deliveryAddress.postalCode}` : "";
  const stepLabel = (status: string) => t(`timeline.${order.fulfilment}.${status}` as "timeline.pickup.received");
  const current = timeline.steps.find((s) => s.state === "current");
  const orderPath = getPathname({ locale, href: { pathname: "/order/[code]", params: { code: order.code } } });
  const signUpNext = token ? `${orderPath}?t=${token}` : orderPath;

  return (
    <div className="grid gap-[clamp(24px,4vw,40px)]">
      <LiveOrder
        code={order.code}
        token={token}
        version={tracking.version}
        live={timeline.live}
        intervalMs={pending ? 2500 : 10_000}
        realtime={realtime && !pending}
        readyTitle={t("timeline.notifyTitle", { code: order.code })}
        readyBody={t("timeline.notifyBody")}
      />

      {notice && (
        <p role="status" className="form-note is-ok w-fit">
          {notice}
        </p>
      )}

      {pending ? (
        <header className="grid gap-4" role="status">
          <span className="spinner text-forest" aria-hidden="true" />
          <h1 className="display text-[clamp(2.4rem,5vw,4rem)] text-forest">{t("processingTitle")}</h1>
          <p className="lede">{t("processingText")}</p>
        </header>
      ) : timeline.ended ? (
        <header className="grid gap-4">
          <h1 className="display text-[clamp(2.4rem,5vw,4rem)] text-forest">
            {timeline.ended === "expired" ? t("title", { code: order.code }) : t(`titles.${timeline.ended}`)}
          </h1>
          <p className="lede">{t(`endedText.${timeline.ended}`)}</p>
        </header>
      ) : (
        <header className="grid gap-5">
          <h1 className="display text-[clamp(2.4rem,5vw,4.4rem)] text-forest">{t(`titles.${order.status as "received"}`)}</h1>
          {order.status !== "completed" && (
            <p className="lede">{order.fulfilment === "pickup" && when ? t("pickupText", when) : t("deliveryText", { address })}</p>
          )}
          <p className="order-code" aria-label={t("title", { code: order.code })}>
            {order.code}
          </p>
          <p className="text-ink-soft">{t("emailSent", { email: order.contactEmail })}</p>
        </header>
      )}

      {!pending && timeline.ended !== "expired" && (
        <section className="account-card grid gap-5" aria-labelledby="timeline-h">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="timeline-h" className="font-semibold text-forest">
              {t("timeline.title")}
            </h2>
            {timeline.live && (
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <span className="live-dot" aria-hidden="true" />
                {t("timeline.live")}
              </p>
            )}
          </div>
          <p className="sr-only" aria-live="polite">
            {current ? t("timeline.current", { step: stepLabel(current.status) }) : ""}
          </p>
          <ol className="timeline">
            {timeline.steps.map((step) => (
              <li
                key={step.status}
                className={cx("timeline__step", `is-${step.state}`)}
                aria-current={step.state === "current" ? "step" : undefined}
              >
                <span className="timeline__mark" aria-hidden="true">
                  {step.state === "done" ? (
                    <Icon name="check" size={16} />
                  ) : step.state === "current" ? (
                    <span className="timeline__cup" />
                  ) : null}
                </span>
                <span className="timeline__label">{stepLabel(step.status)}</span>
                <span className="timeline__time">{step.at ? clock.format(step.at) : ""}</span>
              </li>
            ))}
          </ol>
          {(order.status === "received" || order.status === "preparing") && (
            <NotifyButton
              label={t(order.fulfilment === "pickup" ? "timeline.notify" : "timeline.notifyDelivery")}
              enabledLabel={t("timeline.notifyOn")}
              failedLabel={t("timeline.notifyFailed")}
              code={order.code}
              token={token}
            />
          )}
        </section>
      )}

      {tracking.canClaim && (
        <section className="account-card account-card--notice grid gap-3" aria-labelledby="claim-h">
          <h2 id="claim-h" className="font-semibold text-forest">
            {t("claimTitle")}
          </h2>
          <p className="text-ink-soft">{t("claimText")}</p>
          <form action={claimAction}>
            <input type="hidden" name="code" value={order.code} />
            <input type="hidden" name="token" value={token ?? ""} />
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="btn btn--ghost">
              {t("claim")}
            </button>
          </form>
        </section>
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

      <div className="flex flex-wrap items-start gap-4">
        {!pending && (
          <ReorderButton
            action={reorderAction}
            code={order.code}
            token={token}
            labels={{
              idle: t("reorder"),
              pending: t("reorderPending"),
              added: t("reorder"),
              skipped: t.raw("reorderSkipped") as string,
              none: t("reorderNone"),
            }}
          />
        )}
        <Link href="/menu" className="btn btn--ghost">
          {t("backToMenu")}
        </Link>
        {!signedIn && !pending && (
          <Link href={{ pathname: "/account/sign-up", query: { next: signUpNext } }} className="link-u self-center text-forest">
            {t("createAccount", { email: order.contactEmail })}
          </Link>
        )}
      </div>
    </div>
  );
}
