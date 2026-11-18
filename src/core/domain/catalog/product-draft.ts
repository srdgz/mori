import type { LocalizedText } from "../shared/locale";

export type GroupChoice = Readonly<{ groupId: string; defaultOptionId: string | null }>;

export type ProductDraft = Readonly<{
  id: string | null;
  slug: string;
  categoryId: string;
  name: string;
  image: string;
  priceCents: number;
  cupColor: string;
  cupName: LocalizedText;
  shortDescription: LocalizedText;
  description: LocalizedText;
  alt: LocalizedText;
  isVegan: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  sort: number;
  groups: readonly GroupChoice[];
}>;

export type DraftField = "name" | "slug" | "price" | "cupColor" | "shortDescription" | "description" | "alt" | "image" | "category";

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const filled = (text: LocalizedText) => text.es.trim().length > 0 && text.en.trim().length > 0;

export function draftErrors(draft: ProductDraft): DraftField[] {
  const errors: DraftField[] = [];
  if (draft.name.trim().length < 2 || draft.name.length > 60) errors.push("name");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) errors.push("slug");
  if (!Number.isInteger(draft.priceCents) || draft.priceCents < 50 || draft.priceCents > 5000) errors.push("price");
  if (!/^#[0-9a-f]{6}$/i.test(draft.cupColor)) errors.push("cupColor");
  if (!filled(draft.shortDescription)) errors.push("shortDescription");
  if (!filled(draft.description)) errors.push("description");
  if (!filled(draft.alt)) errors.push("alt");
  if (draft.image.trim().length === 0) errors.push("image");
  if (draft.categoryId.trim().length === 0) errors.push("category");
  return errors;
}
