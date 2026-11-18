import { storeSeed } from "../memory/memory-store-repository";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { categorySeed, optionGroupSeed, productGroupIds, productSeed } from "../seed/catalog";
import { demoAddress, demoCustomer, demoFavouriteSlugs, demoStaff } from "../seed/demo";
import { couponSeed, deliveryPostalCodes } from "../seed/shop";
import type { Database } from "./database";
import {
  accounts,
  addresses,
  categories,
  coupons,
  deliveryZones,
  favourites,
  openingHours,
  optionGroups,
  options,
  productOptionGroups,
  products,
  storeSettings,
  users,
} from "./schema";

export { deliveryPostalCodes } from "../seed/shop";

async function seedShop(db: Database): Promise<void> {
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
      .values(couponSeed.map((c) => ({ ...c })))
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

async function seedDemoCustomer(db: Database): Promise<void> {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, demoCustomer.email));
  if (existing) return;
  const password = await hashPassword(demoCustomer.password);
  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: demoCustomer.id,
      name: demoCustomer.name,
      email: demoCustomer.email,
      emailVerified: true,
      phone: demoCustomer.phone,
      isDemo: true,
    });
    await tx.insert(accounts).values({ userId: demoCustomer.id, accountId: demoCustomer.id, providerId: "credential", password });
    await tx.insert(addresses).values({ ...demoAddress, userId: demoCustomer.id, isDefault: true });
    const favouriteIds = productSeed.filter((p) => (demoFavouriteSlugs as readonly string[]).includes(p.slug)).map((p) => p.id);
    await tx.insert(favourites).values(favouriteIds.map((productId) => ({ userId: demoCustomer.id, productId })));
  });
}

async function seedDemoStaff(db: Database): Promise<void> {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, demoStaff.email));
  if (existing) return;
  const password = await hashPassword(demoStaff.password);
  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: demoStaff.id,
      name: demoStaff.name,
      email: demoStaff.email,
      emailVerified: true,
      role: "staff",
      isDemo: true,
    });
    await tx.insert(accounts).values({ userId: demoStaff.id, accountId: demoStaff.id, providerId: "credential", password });
  });
}

export async function seedDatabase(db: Database): Promise<void> {
  await seedShop(db);
  await seedDemoCustomer(db);
  await seedDemoStaff(db);
}
