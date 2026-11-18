import type { ProductDraft } from "@/core/domain/catalog/product-draft";
import type { LocalizedText } from "@/core/domain/shared/locale";

export type AdminProductRow = Readonly<{
  id: string;
  slug: string;
  name: string;
  image: string;
  priceCents: number;
  categoryName: LocalizedText;
  isAvailable: boolean;
  isFeatured: boolean;
  sort: number;
}>;

export type AdminOptionGroup = Readonly<{
  id: string;
  code: string;
  name: LocalizedText;
  required: boolean;
  options: readonly Readonly<{ id: string; code: string; name: LocalizedText; priceDeltaCents: number; isAvailable: boolean }>[];
}>;

export type AdminCategory = Readonly<{ id: string; name: LocalizedText }>;

export interface AdminCatalogRepository {
  list(): Promise<AdminProductRow[]>;
  draft(id: string): Promise<ProductDraft | null>;
  categories(): Promise<AdminCategory[]>;
  optionGroups(): Promise<AdminOptionGroup[]>;
  save(draft: ProductDraft): Promise<{ id: string } | "slug_taken">;
  setAvailability(id: string, available: boolean): Promise<boolean>;
  setOptionAvailability(optionId: string, available: boolean): Promise<boolean>;
}
