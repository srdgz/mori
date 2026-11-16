import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { account } from "@/composition/container";
import { getPathname, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { AuthShell } from "@/ui/account/AuthShell";
import { SignInForm } from "@/ui/account/AuthForms";
import { Icon } from "@/ui/primitives/Icon";
import { demoSignInAction, googleSignInAction, signInAction } from "../actions";
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
  const notice = error === "demo" ? t("demoFailed") : error ? t("googleFailed") : null;
  return (
    <AuthShell title={t("title")} lede={t("lede")}>
      <SignInForm
        action={signInAction}
        googleAction={google ? googleSignInAction : null}
        next={safeNext ?? getPathname({ locale, href: "/account" })}
        notice={notice}
      />
      <section className="account-card mt-8" aria-labelledby="demo-h">
        <h2 id="demo-h" className="font-semibold text-forest">
          {t("demoTitle")}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">{t("demoLede")}</p>
        <form action={demoSignInAction} className="mt-4">
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="btn btn--ghost">
            <Icon name="user" size={18} />
            {t("demo")}
          </button>
        </form>
      </section>
    </AuthShell>
  );
}
