import { getTranslations } from "next-intl/server";
import type { LoyaltyCard as Card } from "@/core/domain/promotions/loyalty";
import { Link } from "@/i18n/navigation";
import { Mark } from "@/ui/brand/Mark";
import { Icon } from "@/ui/primitives/Icon";
import { cx } from "@/ui/primitives/cx";

export async function LoyaltyCard({ card }: { card: Card }) {
  const t = await getTranslations("account.loyalty");
  return (
    <section className="loyalty on-dark" aria-labelledby="loyalty-h">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="loyalty-h" className="loyalty__title">
          {t("title")}
        </h2>
        <span className="loyalty__count">{t("count", { filled: card.filled, required: card.required })}</span>
      </div>
      <ol className="loyalty__stamps" aria-label={t("stampsLabel", { filled: card.filled, required: card.required })}>
        {Array.from({ length: card.required }, (_, i) => {
          const stamped = i < card.filled;
          const last = i === card.required - 1;
          return (
            <li
              key={i}
              className={cx("stamp", stamped && "is-stamped", stamped && i === card.filled - 1 && "is-latest")}
              aria-label={t(stamped ? "stamped" : "empty", { n: i + 1 })}
            >
              <Mark className="stamp__mark" />
              {last && !stamped && <span className="stamp__free">{t("free")}</span>}
            </li>
          );
        })}
      </ol>
      {card.canRedeem ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-semibold text-matcha">{t("ready")}</p>
          <Link href="/menu" className="btn btn--matcha btn--small">
            {t("readyCta")}
            <Icon name="arrow" size={16} />
          </Link>
        </div>
      ) : (
        <p>{t("missing", { count: card.missing })}</p>
      )}
      <p className="loyalty__how">{t("how", { required: card.required })}</p>
    </section>
  );
}
