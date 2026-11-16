import { and, asc, eq, sql } from "drizzle-orm";
import type { AddressRepository, FavouriteRepository } from "@/core/application/ports/account-repositories";
import type { UserId } from "@/core/domain/access/actor";
import type { Address, AddressDraft, AddressId } from "@/core/domain/account/address";
import type { ProductId } from "@/core/domain/catalog/product";
import type { Database } from "./database";
import { addresses, favourites } from "./schema";

type Row = typeof addresses.$inferSelect;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

function toAddress(row: Row): Address {
  return {
    id: row.id as AddressId,
    userId: row.userId as UserId,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    postalCode: row.postalCode,
    city: row.city,
    instructions: row.instructions,
    isDefault: row.isDefault,
  };
}

async function ensureDefault(tx: Tx, userId: UserId): Promise<void> {
  await tx.execute(sql`
    update addresses set is_default = true
    where id = (select id from addresses where user_id = ${userId} order by created_at limit 1)
      and not exists (select 1 from addresses where user_id = ${userId} and is_default)
  `);
}

export class DrizzleAddressRepository implements AddressRepository {
  constructor(private readonly db: Database) {}

  async forUser(userId: UserId): Promise<Address[]> {
    const rows = await this.db.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(asc(addresses.createdAt));
    return rows.map(toAddress);
  }

  async create(userId: UserId, draft: AddressDraft): Promise<Address> {
    return this.db.transaction(async (tx) => {
      if (draft.isDefault) await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
      const [row] = await tx
        .insert(addresses)
        .values({ ...draft, userId })
        .returning();
      await ensureDefault(tx, userId);
      const [fresh] = await tx.select().from(addresses).where(eq(addresses.id, row!.id));
      return toAddress(fresh!);
    });
  }

  async update(userId: UserId, id: AddressId, draft: AddressDraft): Promise<Address | null> {
    return this.db.transaction(async (tx) => {
      const mine = and(eq(addresses.id, id), eq(addresses.userId, userId));
      const [existing] = await tx.select({ id: addresses.id }).from(addresses).where(mine);
      if (!existing) return null;
      if (draft.isDefault) await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
      await tx
        .update(addresses)
        .set({ ...draft, isDefault: draft.isDefault })
        .where(mine);
      await ensureDefault(tx, userId);
      const [fresh] = await tx.select().from(addresses).where(eq(addresses.id, id));
      return toAddress(fresh!);
    });
  }

  async remove(userId: UserId, id: AddressId): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(addresses)
        .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
        .returning({ id: addresses.id });
      await ensureDefault(tx, userId);
      return deleted.length > 0;
    });
  }
}

export class DrizzleFavouriteRepository implements FavouriteRepository {
  constructor(private readonly db: Database) {}

  async forUser(userId: UserId): Promise<ProductId[]> {
    const rows = await this.db
      .select({ productId: favourites.productId })
      .from(favourites)
      .where(eq(favourites.userId, userId))
      .orderBy(asc(favourites.createdAt));
    return rows.map((r) => r.productId as ProductId);
  }

  async add(userId: UserId, productId: ProductId): Promise<void> {
    await this.db.insert(favourites).values({ userId, productId }).onConflictDoNothing();
  }

  async remove(userId: UserId, productId: ProductId): Promise<void> {
    await this.db.delete(favourites).where(and(eq(favourites.userId, userId), eq(favourites.productId, productId)));
  }
}
