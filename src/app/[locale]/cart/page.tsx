import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { CartPage } from "@/ui/shop/CartPage";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "shop.cart" });
  return { title: `${t("title")} — MŌRI Matcha Bar & Culture`, robots: { index: false } };
}

export default async function CartRoute({ params }: Props) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("shop.cart");
  return (
    <section className="pt-[calc(var(--nav-h)+clamp(24px,5vw,64px))] pb-[clamp(64px,9vw,128px)]">
      <div className="wrap grid gap-[clamp(24px,4vw,48px)]">
        <h1 className="display text-[clamp(2.6rem,6vw,5rem)] text-forest">{t("title")}</h1>
        <CartPage />
      </div>
    </section>
  );
}
