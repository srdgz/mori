import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { admin, uploadsEnabled } from "@/composition/checkout";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { ProductEditor } from "@/ui/admin/ProductEditor";
import { saveProductAction } from "../../actions";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "admin" });
  return { title: t("metaTitle", { page: t("products.form.newTitle") }), robots: { index: false } };
}

export default async function NewProductPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await admin().getProductDraft(null);
  if (!data) redirect({ href: "/admin/orders", locale });
  if (!data) return null;
  return (
    <ProductEditor
      draft={null}
      categories={data.categories}
      groups={data.groups}
      uploads={uploadsEnabled()}
      saved={false}
      save={saveProductAction}
    />
  );
}
