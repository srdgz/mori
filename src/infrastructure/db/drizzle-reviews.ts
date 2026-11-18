import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import type { NewReview, ReviewRepository, StaffReview, StoredReview } from "@/core/application/ports/reviews";
import type { UserId } from "@/core/domain/access/actor";
import type { RatingCounts } from "@/core/domain/catalog/review";
import type { Database } from "./database";
import { orderItems, orders, products, reviews, users } from "./schema";

const columns = {
  id: reviews.id,
  productId: reviews.productId,
  rating: reviews.rating,
  body: reviews.body,
  authorName: users.name,
  isHidden: reviews.isHidden,
  createdAt: reviews.createdAt,
};

export class DrizzleReviewRepository implements ReviewRepository {
  constructor(private readonly db: Database) {}

  async counts(productId: string): Promise<RatingCounts> {
    const rows = await this.db
      .select({ rating: reviews.rating, n: sql<number>`count(*)::int` })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.isHidden, false)))
      .groupBy(reviews.rating);
    const counts = [0, 0, 0, 0, 0];
    for (const row of rows) counts[row.rating - 1] = row.n;
    return counts as unknown as RatingCounts;
  }

  async recent(productId: string, limit: number): Promise<StoredReview[]> {
    return this.db
      .select(columns)
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.userId))
      .where(and(eq(reviews.productId, productId), eq(reviews.isHidden, false)))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);
  }

  async purchased(userId: UserId, productIds: readonly string[]): Promise<string[]> {
    if (productIds.length === 0) return [];
    const rows = await this.db
      .selectDistinct({ productId: orderItems.productId })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orders.customerId, userId), eq(orders.status, "completed"), inArray(orderItems.productId, [...productIds])));
    return rows.flatMap((r) => (r.productId ? [r.productId] : []));
  }

  async mine(userId: UserId, productIds: readonly string[]): Promise<StoredReview[]> {
    if (productIds.length === 0) return [];
    return this.db
      .select(columns)
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.userId))
      .where(and(eq(reviews.userId, userId), inArray(reviews.productId, [...productIds])));
  }

  async save(review: NewReview): Promise<void> {
    await this.db
      .insert(reviews)
      .values({ productId: review.productId, userId: review.userId, rating: review.rating, body: review.body })
      .onConflictDoUpdate({
        target: [reviews.productId, reviews.userId],
        set: { rating: review.rating, body: review.body, updatedAt: sql`now()` },
      });
  }

  async forStaff(limit: number, before: Date | null): Promise<StaffReview[]> {
    return this.db
      .select({ ...columns, productName: products.name, authorEmail: sql<string>`${users.email}::text` })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.userId))
      .innerJoin(products, eq(products.id, reviews.productId))
      .where(before ? lt(reviews.createdAt, before) : undefined)
      .orderBy(desc(reviews.createdAt))
      .limit(limit);
  }

  async setHidden(id: string, hidden: boolean): Promise<string | null> {
    const [row] = await this.db
      .update(reviews)
      .set({ isHidden: hidden })
      .where(eq(reviews.id, id))
      .returning({ productId: reviews.productId });
    return row?.productId ?? null;
  }
}
