import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { account } from "@/composition/container";
import type { AppLocale } from "@/i18n/routing";
import { ProfileForm } from "@/ui/account/AccountForms";
import { updateProfileAction } from "../../actions";
import { accountMetadata } from "../../shared";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "profile");
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, { user }] = await Promise.all([getTranslations("account.profile"), account().currentActor()]);
  if (!user) return null;
  return (
    <div className="grid gap-8">
      <header>
        <h1 className="h-lg text-forest">{t("title")}</h1>
        <p className="mt-3 text-ink-soft">{t("lede")}</p>
      </header>
      <div className="account-card">
        <ProfileForm
          action={updateProfileAction}
          profile={{ name: user.name, email: user.email, phone: user.phone, locale: user.locale, marketingOptIn: user.marketingOptIn }}
        />
      </div>
    </div>
  );
}
