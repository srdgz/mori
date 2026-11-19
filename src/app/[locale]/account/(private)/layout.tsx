import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { account } from "@/composition/container";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { AccountNav } from "@/ui/account/AccountNav";
import { Avatar } from "@/ui/account/Avatar";
import { SignOutButton } from "@/ui/account/AccountForms";
import { signOutAction } from "../actions";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export default async function PrivateAccountLayout({ children, params }: Props) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const { user } = await account().currentActor();
  if (!user) redirect({ href: "/account/sign-in", locale });
  const t = await getTranslations("account");

  return (
    <section className="pt-[calc(var(--nav-h)+clamp(24px,5vw,64px))] pb-[clamp(64px,9vw,128px)]">
      <div className="wrap account-shell">
        <aside className="account-shell__side">
          <p className="eyebrow text-forest">{t("nav.account")}</p>
          {user && (
            <div className="account-id">
              <Avatar name={user.name} image={user.image} size={48} />
              <div className="grid min-w-0">
                <span className="truncate font-semibold text-forest">{user.name}</span>
                <span className="truncate text-sm text-ink-soft">{user.email}</span>
              </div>
            </div>
          )}
          <AccountNav />
          <SignOutButton action={signOutAction} label={t("nav.signOut")} className="account-nav__link account-nav__signout" />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
