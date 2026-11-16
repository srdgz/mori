import { storeSeed } from "../memory/memory-store-repository";
import { categorySeed, optionGroupSeed, productGroupIds, productSeed } from "../seed/catalog";
import type { Database } from "./database";
import {
  categories,
  coupons,
  deliveryZones,
  openingHours,
  optionGroups,
  options,
  productOptionGroups,
  products,
  storeSettings,
} from "./schema";

export const deliveryPostalCodes = ["28004", "28005", "28010", "28012", "28013", "28015"];

export async function seedDatabase(db: Database): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(storeSettings).values({ id: 1 }).onConflictDoNothing();

    await tx
      .insert(openingHours)
      .values(
        Object.entries(storeSeed.schedule).map(([weekday, day]) => ({
          weekday: Number(weekday),
          opensAt: day?.opens ?? null,
          closesAt: day?.closes ?? null,
        })),
      )
      .onConflictDoNothing();

    await tx
      .insert(deliveryZones)
      .values(deliveryPostalCodes.map((postalCode) => ({ postalCode })))
      .onConflictDoNothing();

    await tx
      .insert(coupons)
      .values([
        { code: "BIENVENIDA10", kind: "percent", value: 10, firstOrderOnly: true },
        { code: "MATCHAMIGO", kind: "amount", value: 200, minSubtotalCents: 1500, perCustomerLimit: null },
      ])
      .onConflictDoNothing();

    await tx.insert(categories).values(categorySeed).onConflictDoNothing();

    await tx
      .insert(optionGroups)
      .values(optionGroupSeed.map(({ id, code, name, selection, required, sort }) => ({ id, code, name, selection, required, sort })))
      .onConflictDoNothing();

    await tx
      .insert(options)
      .values(optionGroupSeed.flatMap((group) => group.options.map((option) => ({ ...option, groupId: group.id }))))
      .onConflictDoNothing();

    await tx
      .insert(products)
      .values(
        productSeed.map((product) => ({
          id: product.id,
          slug: product.slug,
          categoryId: product.categoryId,
          name: product.name,
          image: product.image,
          basePriceCents: product.priceCents,
          cupColor: product.cupColor,
          cupName: product.cupName,
          shortDescription: product.shortDescription,
          description: product.description,
          alt: product.alt,
          tags: product.tags,
          isVegan: product.isVegan,
          isFeatured: product.isFeatured,
          sort: product.sort,
        })),
      )
      .onConflictDoNothing();

    await tx
      .insert(productOptionGroups)
      .values(productSeed.flatMap((product) => product.groups.map((group) => ({ productId: product.id, ...productGroupIds(group) }))))
      .onConflictDoNothing();
  });
}
