import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { account } from "@/composition/container";
import { actorFor, isStaff } from "@/core/domain/access/actor";
import { Link, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Avatar } from "@/ui/account/Avatar";
import { AdminNav } from "@/ui/admin/AdminNav";
import { Icon } from "@/ui/primitives/Icon";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export default async function AdminLayout({ children, params }: Props) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const { user } = await account().currentActor();
  if (!user) redirect({ href: "/account/sign-in", locale });
  if (user && !isStaff(actorFor(user))) redirect({ href: "/account", locale });
  const [t, messages] = await Promise.all([getTranslations("admin"), getMessages()]);

  return (
    <section className="admin pt-[calc(var(--nav-h)+clamp(20px,3vw,40px))] pb-[clamp(48px,7vw,96px)]">
      <div className="wrap account-shell admin-shell">
        <aside className="account-shell__side">
          <p className="eyebrow text-forest">{t("eyebrow")}</p>
          {user && (
            <div className="account-id">
              <Avatar name={user.name} image={user.image} size={48} />
              <div className="grid min-w-0">
                <span className="truncate font-semibold text-forest">{user.name}</span>
                <span className="truncate text-sm text-ink-soft">{user.email}</span>
              </div>
            </div>
          )}
          <NextIntlClientProvider messages={{ admin: { nav: messages.admin.nav } }}>
            <AdminNav isAdmin={user?.role === "admin"} />
          </NextIntlClientProvider>
          <Link href="/" className="account-nav__link">
            <Icon name="left" size={16} />
            {t("nav.backToShop")}
          </Link>
        </aside>
        <div className="grid min-w-0 content-start gap-6">
          {user?.isDemo && user.role === "staff" && (
            <section className="account-card account-card--notice" aria-labelledby="admin-demo-h">
              <h2 id="admin-demo-h" className="font-semibold text-forest">
                {t("demo.title")}
              </h2>
              <p className="mt-2 max-w-[70ch] text-sm text-ink-soft">{t("demo.text")}</p>
            </section>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
