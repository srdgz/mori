import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { AuthShell } from "@/ui/account/AuthShell";
import { InvalidResetLink, ResetPasswordForm } from "@/ui/account/AuthForms";
import { resetPasswordAction } from "../actions";
import { accountMetadata } from "../shared";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ token?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "reset");
}

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token, error } = await searchParams;
  const t = await getTranslations("account.reset");
  return (
    <AuthShell title={t("title")} lede={t("lede")}>
      {token && !error ? <ResetPasswordForm action={resetPasswordAction} token={token} /> : <InvalidResetLink />}
    </AuthShell>
  );
}
