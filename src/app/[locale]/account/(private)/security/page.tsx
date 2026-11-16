import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { account } from "@/composition/container";
import { DELETE_CONFIRMATION } from "@/core/application/account/profile";
import type { AppLocale } from "@/i18n/routing";
import { DeleteAccountForm, PasswordForm, SignOutButton } from "@/ui/account/AccountForms";
import { changePasswordAction, deleteAccountAction, signOutAction } from "../../actions";
import { accountMetadata } from "../../shared";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "security");
}

export default async function SecurityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, { user }] = await Promise.all([getTranslations("account.security"), account().currentActor()]);
  if (!user) return null;
  const locked = user.isDemo;

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="h-lg text-forest">{t("title")}</h1>
        <p className="mt-3 text-ink-soft">{t("lede")}</p>
      </header>

      {locked && <p className="form-note is-ok">{t("demoLocked")}</p>}

      <section className="account-card" aria-labelledby="password-h">
        <h2 id="password-h" className="mb-5 font-semibold text-forest">
          {t("passwordTitle")}
        </h2>
        {!user.hasPassword ? (
          <p className="text-ink-soft">{t("googleOnly")}</p>
        ) : locked ? null : (
          <PasswordForm action={changePasswordAction} />
        )}
      </section>

      <section className="account-card" aria-labelledby="signout-h">
        <h2 id="signout-h" className="font-semibold text-forest">
          {t("signOutTitle")}
        </h2>
        <p className="mt-2 mb-5 text-ink-soft">{t("signOutText")}</p>
        <SignOutButton action={signOutAction} label={t("signOut")} className="btn btn--ghost" />
      </section>

      {!locked && (
        <section className="account-card account-card--danger" aria-labelledby="delete-h">
          <h2 id="delete-h" className="font-semibold text-forest">
            {t("deleteTitle")}
          </h2>
          <p className="mt-2 mb-5 max-w-[60ch] text-ink-soft">{t("deleteText")}</p>
          <DeleteAccountForm action={deleteAccountAction} word={DELETE_CONFIRMATION[locale]} needsPassword={user.hasPassword} />
        </section>
      )}
    </div>
  );
}
