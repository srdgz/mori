import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";

type Section = "signIn" | "signUp" | "forgot" | "reset" | "profile" | "addresses" | "favourites" | "security";

export async function accountMetadata(locale: AppLocale, section: Section | "overview"): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "account" });
  const page = section === "overview" ? t("title") : t(`${section}.title`);
  return { title: t("metaTitle", { page }) };
}

export type LocaleParams = { params: Promise<{ locale: AppLocale }> };
