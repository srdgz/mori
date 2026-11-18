import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { account } from "@/composition/container";
import { getPathname, Link, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { AuthShell } from "@/ui/account/AuthShell";
import { SignInForm } from "@/ui/account/AuthForms";
import { PendingButton } from "@/ui/account/form";
import { Icon } from "@/ui/primitives/Icon";
import { demoSignInAction, googleSignInAction, signInAction, staffDemoSignInAction } from "../actions";
import { accountMetadata } from "../shared";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ next?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "signIn");
}

export default async function SignInPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next, error } = await searchParams;
  const services = account();
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : null;
  if ((await services.currentActor()).user) redirect({ href: "/account", locale });
  const t = await getTranslations("account.signIn");
  const google = services.identity.socialProviders().includes("google");
  const fromCheckout = safeNext === getPathname({ locale, href: "/checkout" });
  const notice = error === "demo" ? t("demoFailed") : error ? t("googleFailed") : null;
  return (
    <AuthShell title={t("title")} lede={t("lede")}>
      <SignInForm
        action={signInAction}
        googleAction={google ? googleSignInAction : null}
        next={safeNext ?? getPathname({ locale, href: "/account" })}
        notice={notice}
      />
      {fromCheckout && (
        <section className="account-card mt-8" aria-labelledby="guest-h">
          <h2 id="guest-h" className="font-semibold text-forest">
            {t("guest")}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">{t("guestText")}</p>
          <Link href="/checkout" className="btn btn--ghost mt-4">
            {t("guest")}
            <Icon name="arrow" />
          </Link>
        </section>
      )}
      <section className="account-card mt-8" aria-labelledby="demo-h">
        <h2 id="demo-h" className="font-semibold text-forest">
          {t("demoTitle")}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">{t("demoLede")}</p>
        <form action={demoSignInAction} className="mt-4">
          <input type="hidden" name="locale" value={locale} />
          <PendingButton className="btn--ghost" pendingLabel={t("demoPending")}>
            <Icon name="user" size={18} />
            {t("demo")}
          </PendingButton>
        </form>
        <p className="mt-5 text-sm text-ink-soft">{t("staffDemoText")}</p>
        <form action={staffDemoSignInAction} className="mt-3">
          <input type="hidden" name="locale" value={locale} />
          <PendingButton className="btn--ghost" pendingLabel={t("staffDemoPending")}>
            <Icon name="cup" size={18} />
            {t("staffDemo")}
          </PendingButton>
        </form>
      </section>
    </AuthShell>
  );
}
