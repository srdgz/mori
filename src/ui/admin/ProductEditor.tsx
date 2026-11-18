import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import type { SaveProductResult } from "@/core/application/admin/catalog";
import type { AdminCategory, AdminOptionGroup } from "@/core/application/ports/admin-catalog";
import type { ProductDraft } from "@/core/domain/catalog/product-draft";
import { Link } from "@/i18n/navigation";
import { productPhotoKeys } from "@/ui/brand/photos";
import { Icon } from "@/ui/primitives/Icon";
import { ProductForm } from "./ProductForm";

type Props = {
  draft: ProductDraft | null;
  categories: readonly AdminCategory[];
  groups: readonly AdminOptionGroup[];
  uploads: boolean;
  saved: boolean;
  save: (input: ProductDraft) => Promise<SaveProductResult>;
};

export async function ProductEditor({ draft, categories, groups, uploads, saved, save }: Props) {
  const [t, p, messages] = await Promise.all([getTranslations("admin.products.form"), getTranslations("admin.products"), getMessages()]);
  return (
    <div className="grid gap-6">
      <Link href="/admin/products" className="link-u w-fit text-sm text-forest">
        <Icon name="left" size={16} />
        {t("back")}
      </Link>
      <h1 className="display text-[clamp(2rem,4vw,3.2rem)] text-forest">{draft ? t("editTitle", { name: draft.name }) : t("newTitle")}</h1>
      {saved && (
        <p role="status" className="form-note is-ok w-fit">
          {p("saved")}
        </p>
      )}
      <NextIntlClientProvider messages={{ admin: { products: { form: messages.admin.products.form } } }}>
        <ProductForm
          key={draft?.id ?? "new"}
          draft={draft}
          categories={categories}
          groups={groups}
          library={productPhotoKeys}
          uploads={uploads}
          save={save}
        />
      </NextIntlClientProvider>
    </div>
  );
}
