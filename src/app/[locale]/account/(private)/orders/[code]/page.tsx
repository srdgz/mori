import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { checkout, realtimeEnabled } from "@/composition/checkout";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Icon } from "@/ui/primitives/Icon";
import { OrderDetails } from "@/ui/shop/OrderDetails";
import { ReviewForm } from "@/ui/account/ReviewForm";
import { claimOrderAction, reorderAction, submitReviewAction } from "../../../../order/actions";

type Props = { params: Promise<{ locale: AppLocale; code: string }>; searchParams: Promise<{ saved?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: "shop.order" });
  return { title: `${t("title", { code: code.toUpperCase() })} — MŌRI Matcha Bar & Culture`, robots: { index: false } };
}

export default async function AccountOrderPage({ params, searchParams }: Props) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const { saved } = await searchParams;
  const [t, s, r, tracking, reviewables] = await Promise.all([
    getTranslations("account.orders"),
    getTranslations("shop.order"),
    getTranslations("account.reviews"),
    checkout().trackOrder(code, null),
    checkout().getOrderReviews(code),
  ]);
  if (!tracking) notFound();

  return (
    <div className="grid gap-6">
      <Link href="/account/orders" className="link-u w-fit text-sm text-forest">
        <Icon name="left" size={16} />
        {t("back")}
      </Link>
      <OrderDetails
        tracking={tracking}
        locale={locale}
        token={null}
        signedIn
        reorderAction={reorderAction}
        claimAction={claimOrderAction}
        realtime={realtimeEnabled()}
        notice={saved ? s("claimed") : null}
      />
      {reviewables && reviewables.length > 0 && (
        <section className="account-card grid gap-6" aria-labelledby="review-h">
          <div>
            <h2 id="review-h" className="h-md text-forest">
              {r("title")}
            </h2>
            <p className="mt-2 text-ink-soft">{r("lede")}</p>
          </div>
          {reviewables.map((item) => (
            <ReviewForm key={item.productId} item={item} action={submitReviewAction} />
          ))}
        </section>
      )}
    </div>
  );
}
