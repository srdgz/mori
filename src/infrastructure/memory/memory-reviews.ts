import type { NewReview, ReviewRepository, StaffReview, StoredReview } from "@/core/application/ports/reviews";
import type { UserId } from "@/core/domain/access/actor";
import type { RatingCounts } from "@/core/domain/catalog/review";
import type { MemoryOrderRepository } from "./memory-checkout";

type Row = StoredReview & { userId: UserId };

export class MemoryReviewRepository implements ReviewRepository {
  readonly rows: Row[] = [];
  private counter = 0;

  constructor(
    private readonly orders: MemoryOrderRepository,
    private readonly people: (id: UserId) => { name: string; email: string },
    private readonly productName: (id: string) => string = (id) => id,
  ) {}

  async counts(productId: string): Promise<RatingCounts> {
    const counts = [0, 0, 0, 0, 0];
    for (const row of this.rows) if (row.productId === productId && !row.isHidden) counts[row.rating - 1]! += 1;
    return counts as unknown as RatingCounts;
  }

  async recent(productId: string, limit: number): Promise<StoredReview[]> {
    return this.rows
      .filter((r) => r.productId === productId && !r.isHidden)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map(({ userId: _userId, ...review }) => review);
  }

  async purchased(userId: UserId, productIds: readonly string[]): Promise<string[]> {
    const bought = new Set(
      this.orders.orders.filter((o) => o.customerId === userId && o.status === "completed").flatMap((o) => o.lines.map((l) => l.productId)),
    );
    return productIds.filter((id) => bought.has(id));
  }

  async mine(userId: UserId, productIds: readonly string[]): Promise<StoredReview[]> {
    return this.rows.filter((r) => r.userId === userId && productIds.includes(r.productId)).map(({ userId: _userId, ...review }) => review);
  }

  async save(review: NewReview): Promise<void> {
    const index = this.rows.findIndex((r) => r.userId === review.userId && r.productId === review.productId);
    const existing = this.rows[index];
    if (existing) {
      this.rows[index] = { ...existing, rating: review.rating, body: review.body };
      return;
    }
    this.counter += 1;
    this.rows.push({
      id: `review-${this.counter}`,
      productId: review.productId,
      userId: review.userId,
      rating: review.rating,
      body: review.body,
      authorName: this.people(review.userId).name,
      isHidden: false,
      createdAt: new Date(Date.now() + this.counter),
    });
  }

  async forStaff(limit: number, before: Date | null): Promise<StaffReview[]> {
    return this.rows
      .filter((r) => before === null || r.createdAt < before)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map(({ userId, ...review }) => ({
        ...review,
        productName: this.productName(review.productId),
        authorEmail: this.people(userId).email,
      }));
  }

  async setHidden(id: string, hidden: boolean): Promise<string | null> {
    const row = this.rows.find((r) => r.id === id);
    if (!row) return null;
    Object.assign(row, { isHidden: hidden });
    return row.productId;
  }
}
