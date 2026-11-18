import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { admin } from "@/composition/checkout";
import { Link, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Switch } from "@/ui/admin/ProductsClient";
import { Stars } from "@/ui/shop/Stars";
import { setReviewVisibleAction } from "../actions";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ before?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "admin" });
  return { title: t("metaTitle", { page: t("nav.reviews") }), robots: { index: false } };
}

export default async function ReviewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { before } = await searchParams;
  const since = before && !Number.isNaN(Date.parse(before)) ? new Date(before) : null;
  const [t, page] = await Promise.all([getTranslations("admin.reviews"), admin().listReviews(since)]);
  if (!page) redirect({ href: "/admin/orders", locale });
  if (!page) return null;
  const date = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { dateStyle: "medium", timeZone: "Europe/Madrid" });
  const last = page.reviews.at(-1);

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="display text-[clamp(2rem,4vw,3.2rem)] text-forest">{t("title")}</h1>
        <p className="lede mt-3">{t("lede")}</p>
        {!page.canModerate && <p className="mt-3 text-sm text-ink-soft">{t("readOnly")}</p>}
      </header>

      {page.reviews.length === 0 ? (
        <p className="text-ink-soft">{t("empty")}</p>
      ) : (
        <ul className="grid gap-2">
          {page.reviews.map((review) => (
            <li key={review.id} className="admin-row items-start">
              <div className="grid min-w-0 flex-1 gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-forest">{review.productName}</span>
                  <Stars value={review.rating} label={t("rating", { rating: review.rating })} />
                  {review.isHidden && <span className="tag">{t("hiddenTag")}</span>}
                </div>
                {review.body && <p className="text-ink-soft">{review.body}</p>}
                <span className="text-xs text-ink-soft">
                  {review.authorName} · {review.authorEmail} · {date.format(review.createdAt)}
                </span>
              </div>
              {page.canModerate && (
                <Switch
                  checked={!review.isHidden}
                  label={t("visibleLabel", { product: review.productName, author: review.authorName })}
                  onLabel={t("visible")}
                  offLabel={t("hidden")}
                  onChange={setReviewVisibleAction.bind(null, review.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {page.hasMore && last && (
        <Link href={{ pathname: "/admin/reviews", query: { before: last.createdAt.toISOString() } }} className="link-u w-fit text-forest">
          {t("older")}
        </Link>
      )}
    </div>
  );
}
