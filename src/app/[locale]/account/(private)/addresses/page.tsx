import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { account } from "@/composition/container";
import type { AppLocale } from "@/i18n/routing";
import { AddressBook } from "@/ui/account/AddressBook";
import { removeAddressAction, saveAddressAction } from "../../actions";
import { accountMetadata } from "../../shared";

type Props = { params: Promise<{ locale: AppLocale }> };

const DELIVERY_ZONE = ["28004", "28005", "28010", "28012", "28013", "28015"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "addresses");
}

export default async function AddressesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, addresses] = await Promise.all([getTranslations("account.addresses"), account().listAddresses()]);
  return (
    <div className="grid gap-8">
      <header>
        <h1 className="h-lg text-forest">{t("title")}</h1>
        <p className="mt-3 text-ink-soft">{t("lede")}</p>
      </header>
      <AddressBook addresses={addresses} zone={DELIVERY_ZONE} save={saveAddressAction} remove={removeAddressAction} />
    </div>
  );
}
