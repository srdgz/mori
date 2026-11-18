import type { AdminCatalogRepository, AdminCategory, AdminOptionGroup, AdminProductRow } from "@/core/application/ports/admin-catalog";
import type { ProductDraft } from "@/core/domain/catalog/product-draft";

export class MemoryAdminCatalogRepository implements AdminCatalogRepository {
  readonly drafts: ProductDraft[] = [];
  private counter = 0;

  constructor(
    private readonly categoryList: AdminCategory[] = [{ id: "cat-signature", name: { es: "De la casa", en: "Signature" } }],
    private groups: AdminOptionGroup[] = [],
  ) {}

  async list(): Promise<AdminProductRow[]> {
    return [...this.drafts]
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
      .map((d) => ({
        id: d.id!,
        slug: d.slug,
        name: d.name,
        image: d.image,
        priceCents: d.priceCents,
        categoryName: this.categoryList.find((c) => c.id === d.categoryId)?.name ?? { es: "", en: "" },
        isAvailable: d.isAvailable,
        isFeatured: d.isFeatured,
        sort: d.sort,
      }));
  }

  async draft(id: string): Promise<ProductDraft | null> {
    return this.drafts.find((d) => d.id === id) ?? null;
  }

  async categories(): Promise<AdminCategory[]> {
    return this.categoryList;
  }

  async optionGroups(): Promise<AdminOptionGroup[]> {
    return this.groups;
  }

  async save(draft: ProductDraft): Promise<{ id: string } | "slug_taken"> {
    if (this.drafts.some((d) => d.slug === draft.slug && d.id !== draft.id)) return "slug_taken";
    const index = this.drafts.findIndex((d) => d.id === draft.id);
    if (draft.id && index >= 0) {
      this.drafts[index] = { ...draft, name: draft.name.trim() };
      return { id: draft.id };
    }
    this.counter += 1;
    const id = `product-${this.counter}`;
    this.drafts.push({ ...draft, id, name: draft.name.trim() });
    return { id };
  }

  async setAvailability(id: string, available: boolean): Promise<boolean> {
    const index = this.drafts.findIndex((d) => d.id === id);
    if (index < 0) return false;
    this.drafts[index] = { ...this.drafts[index]!, isAvailable: available };
    return true;
  }

  async setOptionAvailability(optionId: string, available: boolean): Promise<boolean> {
    const found = this.groups.some((g) => g.options.some((o) => o.id === optionId));
    this.groups = this.groups.map((g) => ({
      ...g,
      options: g.options.map((o) => (o.id === optionId ? { ...o, isAvailable: available } : o)),
    }));
    return found;
  }
}
