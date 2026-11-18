import { asc, eq } from "drizzle-orm";
import type { AdminCatalogRepository, AdminCategory, AdminOptionGroup, AdminProductRow } from "@/core/application/ports/admin-catalog";
import type { ProductDraft } from "@/core/domain/catalog/product-draft";
import type { Database } from "./database";
import { categories, optionGroups, options, productOptionGroups, products } from "./schema";

function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } }).cause;
  return (error as { code?: string }).code === "23505" || cause?.code === "23505";
}

export class DrizzleAdminCatalogRepository implements AdminCatalogRepository {
  constructor(private readonly db: Database) {}

  async list(): Promise<AdminProductRow[]> {
    const rows = await this.db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        image: products.image,
        priceCents: products.basePriceCents,
        categoryName: categories.name,
        isAvailable: products.isAvailable,
        isFeatured: products.isFeatured,
        sort: products.sort,
      })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .orderBy(asc(products.sort), asc(products.name));
    return rows;
  }

  async draft(id: string): Promise<ProductDraft | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const [row] = await this.db.select().from(products).where(eq(products.id, id));
    if (!row) return null;
    const groups = await this.db
      .select({ groupId: productOptionGroups.groupId, defaultOptionId: productOptionGroups.defaultOptionId, sort: optionGroups.sort })
      .from(productOptionGroups)
      .innerJoin(optionGroups, eq(optionGroups.id, productOptionGroups.groupId))
      .where(eq(productOptionGroups.productId, id))
      .orderBy(asc(optionGroups.sort));
    return {
      id: row.id,
      slug: row.slug,
      categoryId: row.categoryId,
      name: row.name,
      image: row.image,
      priceCents: row.basePriceCents,
      cupColor: row.cupColor,
      cupName: row.cupName,
      shortDescription: row.shortDescription,
      description: row.description,
      alt: row.alt,
      isVegan: row.isVegan,
      isAvailable: row.isAvailable,
      isFeatured: row.isFeatured,
      sort: row.sort,
      groups: groups.map(({ groupId, defaultOptionId }) => ({ groupId, defaultOptionId })),
    };
  }

  async categories(): Promise<AdminCategory[]> {
    return this.db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sort));
  }

  async optionGroups(): Promise<AdminOptionGroup[]> {
    const groups = await this.db.select().from(optionGroups).orderBy(asc(optionGroups.sort));
    const all = await this.db.select().from(options).orderBy(asc(options.sort));
    return groups.map((g) => ({
      id: g.id,
      code: g.code,
      name: g.name,
      required: g.required,
      options: all
        .filter((o) => o.groupId === g.id)
        .map((o) => ({ id: o.id, code: o.code, name: o.name, priceDeltaCents: o.priceDeltaCents, isAvailable: o.isAvailable })),
    }));
  }

  async save(draft: ProductDraft): Promise<{ id: string } | "slug_taken"> {
    const values = {
      slug: draft.slug,
      categoryId: draft.categoryId,
      name: draft.name.trim(),
      image: draft.image,
      basePriceCents: draft.priceCents,
      cupColor: draft.cupColor,
      cupName: draft.cupName,
      shortDescription: draft.shortDescription,
      description: draft.description,
      alt: draft.alt,
      isVegan: draft.isVegan,
      isAvailable: draft.isAvailable,
      isFeatured: draft.isFeatured,
      sort: draft.sort,
    };
    try {
      return await this.db.transaction(async (tx) => {
        let id = draft.id;
        if (id) {
          await tx.update(products).set(values).where(eq(products.id, id));
        } else {
          const [created] = await tx.insert(products).values(values).returning({ id: products.id });
          id = created!.id;
        }
        const kept = await tx
          .select({ groupId: productOptionGroups.groupId, allowed: productOptionGroups.allowedOptionIds })
          .from(productOptionGroups)
          .where(eq(productOptionGroups.productId, id));
        await tx.delete(productOptionGroups).where(eq(productOptionGroups.productId, id));
        if (draft.groups.length > 0) {
          await tx.insert(productOptionGroups).values(
            draft.groups.map((g) => ({
              productId: id!,
              groupId: g.groupId,
              defaultOptionId: g.defaultOptionId,
              allowedOptionIds: kept.find((k) => k.groupId === g.groupId)?.allowed ?? null,
            })),
          );
        }
        return { id };
      });
    } catch (error) {
      if (isUniqueViolation(error)) return "slug_taken";
      throw error;
    }
  }

  async setAvailability(id: string, available: boolean): Promise<boolean> {
    const updated = await this.db
      .update(products)
      .set({ isAvailable: available })
      .where(eq(products.id, id))
      .returning({ id: products.id });
    return updated.length > 0;
  }

  async setOptionAvailability(optionId: string, available: boolean): Promise<boolean> {
    const updated = await this.db
      .update(options)
      .set({ isAvailable: available })
      .where(eq(options.id, optionId))
      .returning({ id: options.id });
    return updated.length > 0;
  }
}
