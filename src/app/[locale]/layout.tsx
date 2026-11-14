import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { container } from "@/composition/container";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/ui/seo/metadata";
import { Footer } from "@/ui/brand/Footer";
import { Header } from "@/ui/brand/Header";
import { LogoSprite } from "@/ui/brand/LogoSprite";
import { MotionRoot } from "@/ui/motion/MotionRoot";
import { StoreJsonLd } from "@/ui/seo/StoreJsonLd";
import "@/styles/globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export const viewport: Viewport = { themeColor: "#183D2B" };

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [messages, t, store] = await Promise.all([getMessages(), getTranslations("common"), container().getStoreInfo()]);
  const clientMessages = { common: messages.common, nav: messages.nav };

  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body>
        <LogoSprite />
        <StoreJsonLd store={store} />
        <NextIntlClientProvider messages={clientMessages}>
          <a
            href="#main"
            className="fixed top-[-80px] left-3 z-[100] rounded-full bg-forest px-4 py-2.5 text-cream transition-[top] focus:top-3"
          >
            {t("skip")}
          </a>
          <Header address={store.address.street} instagram={store.instagram} />
          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <Footer store={store} />
          <MotionRoot />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
