import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { admin, uploadsEnabled } from "@/composition/checkout";
import type { AppLocale } from "@/i18n/routing";
import { ProductEditor } from "@/ui/admin/ProductEditor";
import { saveProductAction } from "../../actions";

type Props = { params: Promise<{ locale: AppLocale; id: string }>; searchParams: Promise<{ saved?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "admin" });
  return { title: t("metaTitle", { page: t("nav.products") }), robots: { index: false } };
}

export default async function EditProductPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [data, { saved }] = await Promise.all([admin().getProductDraft(id), searchParams]);
  if (!data?.draft) notFound();
  return (
    <ProductEditor
      draft={data.draft}
      categories={data.categories}
      groups={data.groups}
      uploads={uploadsEnabled()}
      saved={saved === "1"}
      save={saveProductAction}
    />
  );
}
