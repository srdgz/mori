import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { checkout, realtimeEnabled } from "@/composition/checkout";
import { account } from "@/composition/container";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Icon } from "@/ui/primitives/Icon";
import { ClearCartFor } from "@/ui/shop/OrderClient";
import { OrderDetails } from "@/ui/shop/OrderDetails";
import { claimOrderAction, reorderAction } from "../actions";

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
  const [t, tracking, { user }] = await Promise.all([
    getTranslations("shop.order"),
    checkout().trackOrder(code, token ?? null),
    account().currentActor(),
  ]);

  if (!tracking) {
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

  const { order } = tracking;
  return (
    <section className="pt-[calc(var(--nav-h)+clamp(24px,5vw,64px))] pb-[clamp(64px,9vw,128px)]">
      {(redirectStatus === "succeeded" || order.status !== "pending_payment") && <ClearCartFor code={order.code} />}
      <div className="wrap max-w-[880px]">
        <OrderDetails
          tracking={tracking}
          locale={locale}
          token={token ?? null}
          signedIn={Boolean(user)}
          reorderAction={reorderAction}
          claimAction={claimOrderAction}
          realtime={realtimeEnabled()}
        />
      </div>
    </section>
  );
}
