import { asc, eq, type SQL } from "drizzle-orm";
import type { CatalogRepository } from "@/core/application/ports/catalog-repository";
import type { Option, OptionGroup, OptionGroupId, OptionId } from "@/core/domain/catalog/options";
import type { Product, ProductId } from "@/core/domain/catalog/product";
import { money } from "@/core/domain/shared/money";
import type { Database } from "./database";
import { options, products } from "./schema";

function findProducts(db: Database, where?: SQL) {
  return db.query.products.findMany({
    where,
    orderBy: [asc(products.sort)],
    with: { optionGroups: { with: { group: { with: { options: { orderBy: [asc(options.sort)] } } } } } },
  });
}

type ProductRow = Awaited<ReturnType<typeof findProducts>>[number];
type ProductGroupRow = {
  defaultOptionId: string | null;
  allowedOptionIds: string[] | null;
  group: {
    id: string;
    code: string;
    name: OptionGroup["name"];
    selection: "single" | "multiple";
    required: boolean;
    sort: number;
    options: { id: string; code: string; name: Option["name"]; priceDeltaCents: number; isAvailable: boolean; sort: number }[];
  };
};

function toGroup(row: ProductGroupRow): OptionGroup {
  const allowed = row.allowedOptionIds;
  return {
    id: row.group.id as OptionGroupId,
    code: row.group.code,
    name: row.group.name,
    selection: row.group.selection,
    required: row.group.required,
    sort: row.group.sort,
    defaultOptionId: row.defaultOptionId as OptionId | null,
    options: row.group.options
      .filter((o) => allowed === null || allowed.includes(o.id))
      .map((o) => ({
        id: o.id as OptionId,
        code: o.code,
        name: o.name,
        priceDelta: money(o.priceDeltaCents),
        isAvailable: o.isAvailable,
        sort: o.sort,
      })),
  };
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id as ProductId,
    slug: row.slug,
    name: row.name,
    imageKey: row.image,
    price: money(row.basePriceCents),
    cupColor: row.cupColor,
    cupName: row.cupName,
    shortDescription: row.shortDescription,
    description: row.description,
    alt: row.alt,
    tags: row.tags,
    isVegan: row.isVegan,
    isAvailable: row.isAvailable,
    isFeatured: row.isFeatured,
    sort: row.sort,
    optionGroups: row.optionGroups.map(toGroup).sort((a, b) => a.sort - b.sort),
  };
}

export class DrizzleCatalogRepository implements CatalogRepository {
  constructor(private readonly db: Database) {}

  async all(): Promise<readonly Product[]> {
    return (await findProducts(this.db)).map(toProduct);
  }

  async bySlug(slug: string): Promise<Product | null> {
    const [row] = await findProducts(this.db, eq(products.slug, slug));
    return row ? toProduct(row) : null;
  }
}
