import { can } from "@/core/domain/access/actor";
import { draftErrors, type DraftField, type ProductDraft } from "@/core/domain/catalog/product-draft";
import { currentActor } from "../checkout/tracking";
import type { AdminCatalogRepository, AdminCategory, AdminOptionGroup, AdminProductRow } from "../ports/admin-catalog";
import type { Identity } from "../ports/identity";

export type CatalogEditor = Readonly<{ categories: AdminCategory[]; groups: AdminOptionGroup[] }>;

export type SaveProductResult =
  | Readonly<{ ok: true; id: string }>
  | Readonly<{ ok: false; error: "forbidden" | "slug_taken" | "invalid"; fields: readonly DraftField[] }>;

type Deps = { catalog: AdminCatalogRepository; identity: Identity; onChange: () => void };

async function canManage(identity: Identity): Promise<boolean> {
  return can(await currentActor(identity), "catalog.manage");
}

export function makeListAdminProducts(deps: Omit<Deps, "onChange">) {
  return async (): Promise<(CatalogEditor & { products: AdminProductRow[] }) | null> => {
    if (!(await canManage(deps.identity))) return null;
    const [products, categories, groups] = await Promise.all([deps.catalog.list(), deps.catalog.categories(), deps.catalog.optionGroups()]);
    return { products, categories, groups };
  };
}

export function makeGetProductDraft(deps: Omit<Deps, "onChange">) {
  return async (id: string | null): Promise<(CatalogEditor & { draft: ProductDraft | null }) | null> => {
    if (!(await canManage(deps.identity))) return null;
    const [draft, categories, groups] = await Promise.all([
      id ? deps.catalog.draft(id) : Promise.resolve(null),
      deps.catalog.categories(),
      deps.catalog.optionGroups(),
    ]);
    if (id && !draft) return null;
    return { draft, categories, groups };
  };
}

export function makeSaveProduct(deps: Deps) {
  return async (draft: ProductDraft): Promise<SaveProductResult> => {
    if (!(await canManage(deps.identity))) return { ok: false, error: "forbidden", fields: [] };
    const fields = draftErrors(draft);
    if (fields.length > 0) return { ok: false, error: "invalid", fields };
    const saved = await deps.catalog.save(draft);
    if (saved === "slug_taken") return { ok: false, error: "slug_taken", fields: ["slug"] };
    deps.onChange();
    return { ok: true, id: saved.id };
  };
}

export function makeSetProductAvailability(deps: Deps) {
  return async (id: string, available: boolean): Promise<boolean> => {
    if (!(await canManage(deps.identity))) return false;
    const changed = await deps.catalog.setAvailability(id, available);
    if (changed) deps.onChange();
    return changed;
  };
}

export function makeSetOptionAvailability(deps: Deps) {
  return async (optionId: string, available: boolean): Promise<boolean> => {
    if (!(await canManage(deps.identity))) return false;
    const changed = await deps.catalog.setOptionAvailability(optionId, available);
    if (changed) deps.onChange();
    return changed;
  };
}
