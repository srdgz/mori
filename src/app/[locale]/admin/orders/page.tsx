import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { admin, realtimeEnabled } from "@/composition/checkout";
import { boardTag } from "@/core/application/admin/orders";
import { BOARD_COLUMNS, nextStaffStep } from "@/core/domain/ordering/board";
import { formatMoney } from "@/core/domain/shared/money";
import { addDays, isLocalDate } from "@/core/domain/shared/zoned-time";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { AdvanceButton, BoardWatcher, SoundToggle } from "@/ui/admin/BoardClient";
import { cx } from "@/ui/primitives/cx";
import { advanceOrderAction } from "../actions";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ day?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "admin" });
  return { title: t("metaTitle", { page: t("nav.orders") }), robots: { index: false } };
}

const TIME_ZONE = "Europe/Madrid";

export default async function BoardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const requested = (await searchParams).day;
  const [t, d, board] = await Promise.all([
    getTranslations("admin.board"),
    getTranslations("admin.demo"),
    admin().getBoard(requested && isLocalDate(requested) ? requested : null),
  ]);
  if (!board) return null;

  const dateLocale = locale === "es" ? "es-ES" : "en-GB";
  const clock = new Intl.DateTimeFormat(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
  const dayLabel = new Intl.DateTimeFormat(dateLocale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${board.day}T12:00:00Z`),
  );
  const now = board.now.getTime();
  const codes = BOARD_COLUMNS.flatMap((column) => board.columns[column].map((card) => card.code));
  const failed = t("failed", { code: "{code}" });

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <h1 className="display text-[clamp(2rem,4vw,3.2rem)] text-forest">{requested ? t("titleDay", { day: dayLabel }) : t("title")}</h1>
          <nav className="flex flex-wrap gap-4 text-sm" aria-label={t("title")}>
            <Link href={{ pathname: "/admin/orders", query: { day: addDays(board.day, -1) } }} className="link-u text-forest">
              {t("previous")}
            </Link>
            {requested && (
              <Link href="/admin/orders" className="link-u text-forest">
                {t("today")}
              </Link>
            )}
            <Link href={{ pathname: "/admin/orders", query: { day: addDays(board.day, 1) } }} className="link-u text-forest">
              {t("next")}
            </Link>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SoundToggle label={t("sound")} on={t("soundOn")} off={t("soundOff")} />
          <p className="tag tag--live">{t("live")}</p>
        </div>
      </header>

      <BoardWatcher
        realtime={realtimeEnabled()}
        day={board.day}
        version={boardTag(board.day, board.version)}
        codes={codes}
        live
        announce={t("newOrder", { code: "{code}" })}
      />

      <div className="board">
        {BOARD_COLUMNS.map((column) => (
          <section key={column} className="board__column" aria-labelledby={`col-${column}`}>
            <h2 id={`col-${column}`} className="board__title">
              {t(`columns.${column}`)} <span className="board__count">{board.columns[column].length}</span>
            </h2>
            {board.columns[column].length === 0 ? (
              <p className="text-sm text-ink-soft">{t("empty")}</p>
            ) : (
              <ul className="grid gap-3">
                {board.columns[column].map((card) => {
                  const next = nextStaffStep(card.status, card.fulfilment);
                  const minutes = Math.max(0, Math.round((now - card.createdAt.getTime()) / 60_000));
                  const allowed = board.canAdvance(card);
                  return (
                    <li key={card.code}>
                      <article className={cx("board-card", column === "done" && "board-card--done")} aria-labelledby={`card-${card.code}`}>
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 id={`card-${card.code}`} className="font-semibold tracking-wide text-forest">
                            <Link
                              href={{ pathname: "/admin/orders/[code]", params: { code: card.code } }}
                              className="link-u"
                              aria-label={t("open", { code: card.code })}
                            >
                              {card.code}
                            </Link>
                          </h3>
                          {card.isDemo && <span className="tag">{t("demoTag")}</span>}
                        </div>
                        <p className="text-sm text-ink-soft">
                          {card.slotStart ? clock.format(card.slotStart) : t("asap")} ·{" "}
                          {card.fulfilment === "pickup" ? t("pickup") : `${t("delivery")} ${card.postalCode ?? ""}`}
                          {column !== "done" && ` · ${t("ago", { minutes })}`}
                        </p>
                        <p className="text-sm text-forest">{card.lines.map((l) => `${l.quantity} × ${l.name}`).join(" · ")}</p>
                        {card.notes && <p className="board-card__note">{card.notes}</p>}
                        {column === "done" && <p className="text-sm text-ink-soft">{formatMoney(card.total, locale)}</p>}
                        {next &&
                          (allowed ? (
                            <AdvanceButton
                              action={advanceOrderAction}
                              code={card.code}
                              next={next}
                              label={`${t(`actions.${next as "preparing"}`)} →`}
                              failed={failed.replace("{code}", card.code)}
                            />
                          ) : (
                            <p className="text-xs text-ink-soft">{d("readOnly")}</p>
                          ))}
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
