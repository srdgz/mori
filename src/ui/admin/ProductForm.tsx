"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { SaveProductResult } from "@/core/application/admin/catalog";
import type { AdminCategory, AdminOptionGroup } from "@/core/application/ports/admin-catalog";
import { slugify, type DraftField, type ProductDraft } from "@/core/domain/catalog/product-draft";
import { getPathname } from "@/i18n/navigation";
import { productPhoto } from "@/ui/brand/photos";
import { cx } from "@/ui/primitives/cx";

type Input = ProductDraft & { id: string | null };
type Lang = "es" | "en";
type TextField = "shortDescription" | "description" | "alt" | "cupName";

const blank = { es: "", en: "" };

function emptyDraft(categoryId: string): Input {
  return {
    id: null,
    slug: "",
    categoryId,
    name: "",
    image: "classic",
    priceCents: 450,
    cupColor: "#b6d66b",
    cupName: blank,
    shortDescription: blank,
    description: blank,
    alt: blank,
    isVegan: false,
    isAvailable: true,
    isFeatured: false,
    sort: 50,
    groups: [],
  };
}

export function ProductForm({
  draft,
  categories,
  groups,
  library,
  uploads,
  save,
}: {
  draft: ProductDraft | null;
  categories: readonly AdminCategory[];
  groups: readonly AdminOptionGroup[];
  library: readonly string[];
  uploads: boolean;
  save: (input: Input) => Promise<SaveProductResult>;
}) {
  const t = useTranslations("admin.products.form");
  const locale = useLocale() as Lang;
  const router = useRouter();
  const [value, setValue] = useState<Input>(draft ?? emptyDraft(categories[0]?.id ?? ""));
  const [price, setPrice] = useState(((draft?.priceCents ?? 450) / 100).toFixed(2));
  const [slugTouched, setSlugTouched] = useState(Boolean(draft));
  const [fields, setFields] = useState<readonly DraftField[]>([]);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Input>(key: K, next: Input[K]) => setValue((current) => ({ ...current, [key]: next }));
  const setText = (field: TextField, lang: Lang, text: string) =>
    setValue((current) => ({ ...current, [field]: { ...current[field], [lang]: text } }));
  const invalid = (field: DraftField) => fields.includes(field);
  const errorFor = (field: DraftField) =>
    invalid(field) ? (
      <span className="field-err" id={`err-${field}`}>
        {t(`errors.${field}`)}
      </span>
    ) : null;

  function toggleGroup(group: AdminOptionGroup, on: boolean) {
    set(
      "groups",
      on
        ? [...value.groups, { groupId: group.id, defaultOptionId: group.options.find((o) => o.isAvailable)?.id ?? null }]
        : value.groups.filter((g) => g.groupId !== group.id),
    );
  }

  async function onUpload(file: File) {
    setUploading(true);
    setMessage("");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const blob = await upload(`products/${value.slug || "drink"}.${extension}`, file, {
        access: "public",
        handleUploadUrl: "/api/uploads",
      });
      set("image", blob.url);
    } catch {
      setMessage(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const priceCents = Math.round(Number(price.replace(",", ".")) * 100);
    startTransition(async () => {
      const result = await save({ ...value, priceCents: Number.isFinite(priceCents) ? priceCents : 0 });
      if (result.ok) {
        setFields([]);
        router.push(`${getPathname({ locale, href: { pathname: "/admin/products/[id]", params: { id: result.id } } })}?saved=1`);
        router.refresh();
        return;
      }
      setFields(result.fields);
      setMessage(result.error === "invalid" ? t("errors.invalid") : t(`errors.${result.error}`));
    });
  }

  const textArea = (field: TextField, lang: Lang, rows = 2) => (
    <label className="field">
      <span className="field-label">{lang === "es" ? t("spanish") : t("english")}</span>
      <textarea
        rows={rows}
        value={value[field][lang]}
        onChange={(e) => setText(field, lang, e.target.value)}
        aria-invalid={invalid(field as DraftField) || undefined}
      />
    </label>
  );

  return (
    <form className="product-form" onSubmit={onSubmit} noValidate>
      <div className="grid gap-6">
        <fieldset className="account-card grid gap-4">
          <legend className="font-semibold text-forest">{t("basics")}</legend>
          <label className="field">
            <span className="field-label">{t("name")}</span>
            <input
              value={value.name}
              maxLength={60}
              aria-invalid={invalid("name") || undefined}
              aria-describedby={invalid("name") ? "err-name" : undefined}
              onChange={(e) => {
                const name = e.target.value;
                setValue((current) => ({ ...current, name, slug: slugTouched ? current.slug : slugify(name) }));
              }}
            />
            {errorFor("name")}
          </label>
          <label className="field">
            <span className="field-label">{t("slug")}</span>
            <input
              value={value.slug}
              maxLength={60}
              aria-invalid={invalid("slug") || undefined}
              aria-describedby="slug-hint"
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase());
              }}
            />
            <span id="slug-hint" className="text-xs text-ink-soft">
              {t("slugHint")}
            </span>
            {errorFor("slug")}
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="field">
              <span className="field-label">{t("category")}</span>
              <select
                value={value.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                aria-invalid={invalid("category") || undefined}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name[locale]}
                  </option>
                ))}
              </select>
              {errorFor("category")}
            </label>
            <label className="field">
              <span className="field-label">{t("price")}</span>
              <input
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={invalid("price") || undefined}
              />
              {errorFor("price")}
            </label>
            <label className="field">
              <span className="field-label">{t("sort")}</span>
              <input type="number" min={0} max={999} value={value.sort} onChange={(e) => set("sort", Number(e.target.value) || 0)} />
            </label>
          </div>
          <div className="flex flex-wrap gap-5">
            {(["isAvailable", "isVegan", "isFeatured"] as const).map((flag) => (
              <label key={flag} className="flex items-center gap-3 text-[.92rem] text-forest">
                <input
                  type="checkbox"
                  className="size-5 accent-forest"
                  checked={value[flag]}
                  onChange={(e) => set(flag, e.target.checked)}
                />
                <span>{t(flag === "isAvailable" ? "available" : flag === "isVegan" ? "vegan" : "featured")}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="account-card grid gap-4">
          <legend className="font-semibold text-forest">{t("texts")}</legend>
          {(["shortDescription", "description", "alt", "cupName"] as const).map((field) => (
            <div key={field} className="grid gap-2">
              <p className="font-semibold text-forest">{t(field)}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {textArea(field, "es", field === "description" ? 4 : 2)}
                {textArea(field, "en", field === "description" ? 4 : 2)}
              </div>
              {field !== "cupName" && errorFor(field)}
            </div>
          ))}
          <label className="field w-fit">
            <span className="field-label">{t("cupColor")}</span>
            <input type="color" value={value.cupColor} onChange={(e) => set("cupColor", e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="account-card grid gap-4">
          <legend className="font-semibold text-forest">{t("photo")}</legend>
          <p className="text-sm text-ink-soft">{uploads ? t("photoHint") : t("uploadsOff")}</p>
          {uploads && (
            <label className="btn btn--ghost btn--small w-fit cursor-pointer" aria-busy={uploading || undefined}>
              {uploading && <span className="spinner" aria-hidden="true" />}
              {uploading ? t("uploading") : t("upload")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUpload(file);
                }}
              />
            </label>
          )}
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-forest">{t("library")}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("library")}>
              {library.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={value.image === key}
                  aria-label={key}
                  className={cx("photo-pick", value.image === key && "is-on")}
                  onClick={() => set("image", key)}
                >
                  <Image src={productPhoto(key)} alt="" sizes="64px" className="size-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          {errorFor("image")}
        </fieldset>

        <fieldset className="account-card grid gap-4">
          <legend className="font-semibold text-forest">{t("groups")}</legend>
          <p className="text-sm text-ink-soft">{t("groupsHint")}</p>
          {groups.map((group) => {
            const chosen = value.groups.find((g) => g.groupId === group.id);
            return (
              <div key={group.id} className="flex flex-wrap items-center gap-4">
                <label className="flex min-w-[180px] items-center gap-3 text-[.92rem] text-forest">
                  <input
                    type="checkbox"
                    className="size-5 accent-forest"
                    checked={Boolean(chosen)}
                    onChange={(e) => toggleGroup(group, e.target.checked)}
                  />
                  <span>{group.name[locale]}</span>
                </label>
                {chosen && (
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-ink-soft">{t("defaultOption")}</span>
                    <select
                      value={chosen.defaultOptionId ?? ""}
                      onChange={(e) =>
                        set(
                          "groups",
                          value.groups.map((g) => (g.groupId === group.id ? { ...g, defaultOptionId: e.target.value || null } : g)),
                        )
                      }
                    >
                      <option value="">{t("noDefault")}</option>
                      {group.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name[locale]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            );
          })}
        </fieldset>
      </div>

      <aside className="product-form__side" aria-label={t("preview")}>
        <p className="eyebrow text-forest">{t("preview")}</p>
        <article className="preview-card">
          <span className="media aspect-[4/5] w-full rounded-[14px]">
            <Image src={productPhoto(value.image)} alt="" sizes="280px" className="size-full object-cover" />
          </span>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold text-forest">{value.name || "—"}</h2>
            <p className="text-forest">{price ? `${price.replace(".", locale === "es" ? "," : ".")} €` : ""}</p>
          </div>
          <p className="text-sm text-ink-soft">{value.shortDescription[locale] || "—"}</p>
          <span className="cup-dot" style={{ background: value.cupColor }} aria-hidden="true" />
        </article>
        <button type="submit" className="btn w-full" aria-busy={pending || undefined} data-pending={pending || undefined}>
          {pending && <span className="spinner" aria-hidden="true" />}
          {pending ? t("saving") : t("save")}
        </button>
        <p role="status" className="text-sm text-[#8f2f1c] empty:hidden">
          {message}
        </p>
      </aside>
    </form>
  );
}
