import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { AuthShell } from "@/ui/account/AuthShell";
import { ForgotPasswordForm } from "@/ui/account/AuthForms";
import { forgotPasswordAction } from "../actions";
import { accountMetadata } from "../shared";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "forgot");
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account.forgot");
  return (
    <AuthShell title={t("title")} lede={t("lede")}>
      <ForgotPasswordForm action={forgotPasswordAction} />
    </AuthShell>
  );
}
