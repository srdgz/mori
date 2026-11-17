import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { AuthShell } from "@/ui/account/AuthShell";
import { SignUpForm } from "@/ui/account/AuthForms";
import { signUpAction } from "../actions";
import { accountMetadata } from "../shared";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "signUp");
}

export default async function SignUpPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;
  setRequestLocale(locale);
  const t = await getTranslations("account.signUp");
  return (
    <AuthShell title={t("title")} lede={t("lede")}>
      <SignUpForm action={signUpAction} next={safeNext} />
    </AuthShell>
  );
}
