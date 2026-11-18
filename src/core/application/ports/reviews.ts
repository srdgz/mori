import type { UserId } from "@/core/domain/access/actor";
import type { RatingCounts } from "@/core/domain/catalog/review";

export type StoredReview = Readonly<{
  id: string;
  productId: string;
  rating: number;
  body: string | null;
  authorName: string;
  isHidden: boolean;
  createdAt: Date;
}>;

export type StaffReview = StoredReview & Readonly<{ productName: string; authorEmail: string }>;

export type NewReview = Readonly<{ productId: string; userId: UserId; rating: number; body: string | null }>;

export interface ReviewRepository {
  counts(productId: string): Promise<RatingCounts>;
  recent(productId: string, limit: number): Promise<StoredReview[]>;
  purchased(userId: UserId, productIds: readonly string[]): Promise<string[]>;
  mine(userId: UserId, productIds: readonly string[]): Promise<StoredReview[]>;
  save(review: NewReview): Promise<void>;
  forStaff(limit: number, before: Date | null): Promise<StaffReview[]>;
  setHidden(id: string, hidden: boolean): Promise<string | null>;
}
