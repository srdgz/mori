import { getTranslations } from "next-intl/server";
import type { ProductReviews as Data } from "@/core/application/catalog/reviews";
import type { AppLocale } from "@/i18n/routing";
import { Stars } from "./Stars";

export async function ProductReviews({ data, locale }: { data: Data; locale: AppLocale }) {
  const t = await getTranslations("product.reviews");
  const number = new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const date = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { dateStyle: "medium", timeZone: "Europe/Madrid" });
  const { summary, reviews } = data;

  return (
    <section className="pb-[clamp(64px,9vw,128px)]" aria-labelledby="reviews-h">
      <div className="wrap grid gap-[clamp(24px,4vw,56px)] md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div>
          <h2 id="reviews-h" className="h-md text-forest">
            {t("title")}
          </h2>
          {summary.count > 0 ? (
            <div className="mt-5 grid gap-2">
              <p className="flex items-baseline gap-3">
                <span className="font-display text-5xl font-semibold text-forest">{number.format(summary.average)}</span>
                <Stars value={summary.average} label={t("average", { value: number.format(summary.average) })} size={22} />
              </p>
              <p className="text-ink-soft">{t("count", { count: summary.count })}</p>
            </div>
          ) : (
            <p className="mt-4 text-ink-soft">{t("empty")}</p>
          )}
          <p className="mt-4 text-sm text-ink-soft">{t("how")}</p>
        </div>
        {reviews.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {reviews.map((review) => (
              <li key={review.id} className="review-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-forest">{review.author}</span>
                  <Stars value={review.rating} label={t("rating", { rating: review.rating })} />
                </div>
                {review.body && <p className="text-ink-soft">{review.body}</p>}
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                  <span className="review-card__verified">{t("verified")}</span>
                  <time dateTime={review.createdAt.toISOString()}>{date.format(review.createdAt)}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
