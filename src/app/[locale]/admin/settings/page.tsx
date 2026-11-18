import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { admin } from "@/composition/checkout";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { ListEditor, SettingsForm } from "@/ui/admin/StoreClient";
import { editClosureAction, editZoneAction, saveSettingsAction } from "../actions";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "admin" });
  return { title: t("metaTitle", { page: t("nav.settings") }), robots: { index: false } };
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, messages, settings] = await Promise.all([getTranslations("admin.settings"), getMessages(), admin().getStoreSettings()]);
  if (!settings) redirect({ href: "/admin/orders", locale });
  if (!settings) return null;
  const { closures, zones, ...editable } = settings;

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="display text-[clamp(2rem,4vw,3.2rem)] text-forest">{t("title")}</h1>
        <p className="lede mt-3">{t("lede")}</p>
      </header>
      <NextIntlClientProvider messages={{ admin: { settings: messages.admin.settings } }}>
        <SettingsForm initial={editable} save={saveSettingsAction} />
        <div className="grid gap-5 lg:grid-cols-2">
          <ListEditor items={closures} kind="closures" edit={editClosureAction} />
          <ListEditor items={zones} kind="zones" edit={editZoneAction} />
        </div>
      </NextIntlClientProvider>
    </div>
  );
}
