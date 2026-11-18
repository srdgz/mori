import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { LegalPage } from "@/ui/brand/LegalPage";
import { pageMetadata } from "@/ui/seo/metadata";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.cookies" });
  return pageMetadata({ locale, href: "/cookies", title: `${t("title")} — MŌRI Matcha Bar & Culture`, description: t("description") });
}

export default async function CookiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage doc="cookies" locale={locale} />;
}
