import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { checkout, paymentsEnabled } from "@/composition/checkout";
import { account } from "@/composition/container";
import type { AppLocale } from "@/i18n/routing";
import { CheckoutForm } from "@/ui/shop/CheckoutForm";
import { placeOrderAction, quoteAction } from "./actions";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "shop.checkout" });
  return { title: `${t("title")} — MŌRI Matcha Bar & Culture`, robots: { index: false } };
}

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const services = account();
  const [t, messages, options, { user }] = await Promise.all([
    getTranslations("shop.checkout"),
    getMessages(),
    checkout().getCheckoutOptions(),
    services.currentActor(),
  ]);
  const addresses = user ? await services.listAddresses() : [];

  return (
    <section className="pt-[calc(var(--nav-h)+clamp(24px,5vw,64px))] pb-[clamp(64px,9vw,128px)]">
      <div className="wrap grid gap-[clamp(24px,4vw,40px)]">
        <header>
          <h1 className="display text-[clamp(2.6rem,6vw,5rem)] text-forest">{t("title")}</h1>
          <p className="lede mt-4">{t("lede")}</p>
        </header>
        {options.ordersPaused ? (
          <p className="form-note">{t("paused")}</p>
        ) : (
          <NextIntlClientProvider messages={{ shop: messages.shop, common: messages.common, nav: messages.nav }}>
            <CheckoutForm
              days={options.days}
              deliveryEta={{ min: options.delivery.etaMin, max: options.delivery.etaMax }}
              user={user ? { name: user.name, email: user.email, phone: user.phone } : null}
              addresses={addresses}
              publishableKey={paymentsEnabled() ? (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null) : null}
              actions={{ quote: quoteAction, place: placeOrderAction }}
            />
          </NextIntlClientProvider>
        )}
      </div>
    </section>
  );
}
