import { describe, expect, it } from "vitest";
import type { AdminCatalogRepository } from "@/core/application/ports/admin-catalog";
import type { ProductDraft } from "@/core/domain/catalog/product-draft";

export type AdminCatalogSetup = { catalog: AdminCatalogRepository; categoryId: string; groupId: string; optionId: string };

let sequence = 0;

export function productDraft(overrides: Partial<ProductDraft> = {}): ProductDraft {
  sequence += 1;
  const text = { es: "Texto", en: "Text" };
  return {
    id: null,
    slug: `contract-drink-${sequence}-${Date.now()}`,
    categoryId: "",
    name: ` Contract Drink ${sequence} `,
    image: "classic",
    priceCents: 490,
    cupColor: "#a0522d",
    cupName: text,
    shortDescription: text,
    description: text,
    alt: text,
    isVegan: false,
    isAvailable: true,
    isFeatured: false,
    sort: 99,
    groups: [],
    ...overrides,
  };
}

export function adminCatalogContract(name: string, setup: () => Promise<AdminCatalogSetup>) {
  describe(`${name} (AdminCatalogRepository contract)`, () => {
    it("creates a drink, reads it back and updates it with its option groups", async () => {
      const { catalog, categoryId, groupId, optionId } = await setup();
      const draft = productDraft({ categoryId, groups: [{ groupId, defaultOptionId: optionId }] });
      const created = await catalog.save(draft);
      if (created === "slug_taken") throw new Error("slug_taken");

      const stored = await catalog.draft(created.id);
      expect(stored).toMatchObject({ id: created.id, slug: draft.slug, name: draft.name.trim(), priceCents: 490, categoryId });
      expect(stored?.groups).toEqual([{ groupId, defaultOptionId: optionId }]);

      await catalog.save({ ...stored!, priceCents: 520, groups: [] });
      expect(await catalog.draft(created.id)).toMatchObject({ priceCents: 520, groups: [] });
      expect((await catalog.list()).find((p) => p.id === created.id)).toMatchObject({ priceCents: 520, isAvailable: true });
      expect(await catalog.draft("00000000-0000-4000-8000-00000000dead")).toBeNull();
    });

    it("refuses a slug that is already taken", async () => {
      const { catalog, categoryId } = await setup();
      const first = productDraft({ categoryId });
      await catalog.save(first);
      expect(await catalog.save(productDraft({ categoryId, slug: first.slug }))).toBe("slug_taken");
    });

    it("switches drinks and options on and off", async () => {
      const { catalog, categoryId, groupId, optionId } = await setup();
      const created = await catalog.save(productDraft({ categoryId }));
      if (created === "slug_taken") throw new Error("slug_taken");
      expect(await catalog.setAvailability(created.id, false)).toBe(true);
      expect((await catalog.draft(created.id))?.isAvailable).toBe(false);
      expect(await catalog.setAvailability("00000000-0000-4000-8000-00000000dead", false)).toBe(false);

      expect(await catalog.setOptionAvailability(optionId, false)).toBe(true);
      const group = (await catalog.optionGroups()).find((g) => g.id === groupId);
      expect(group?.options.find((o) => o.id === optionId)?.isAvailable).toBe(false);
      await catalog.setOptionAvailability(optionId, true);
      expect(await catalog.setOptionAvailability("00000000-0000-4000-8000-00000000dead", false)).toBe(false);
      expect((await catalog.categories()).some((c) => c.id === categoryId)).toBe(true);
    });
  });
}
