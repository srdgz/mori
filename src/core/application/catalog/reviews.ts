import { can, isStaff, type UserId } from "@/core/domain/access/actor";
import {
  normaliseReview,
  ratingSummary,
  reviewErrors,
  reviewerName,
  type RatingSummary,
  type ReviewError,
} from "@/core/domain/catalog/review";
import { currentActor } from "../checkout/tracking";
import type { CatalogRepository } from "../ports/catalog-repository";
import type { OrderRepository } from "../ports/checkout";
import type { Identity } from "../ports/identity";
import type { ReviewRepository, StaffReview } from "../ports/reviews";

export const PRODUCT_REVIEWS = 6;
export const STAFF_REVIEW_PAGE = 30;

export type PublicReview = Readonly<{ id: string; rating: number; body: string | null; author: string; createdAt: Date }>;

export type ProductReviews = Readonly<{ summary: RatingSummary; reviews: PublicReview[] }>;

export type ReviewableItem = Readonly<{
  productId: string;
  productName: string;
  mine: Readonly<{ rating: number; body: string | null; isHidden: boolean }> | null;
}>;

export type SubmitReviewResult =
  Readonly<{ status: "saved" }> | Readonly<{ status: "forbidden" }> | Readonly<{ status: "invalid"; errors: ReviewError }>;

export function makeGetProductReviews(reviews: ReviewRepository) {
  return async (productId: string): Promise<ProductReviews> => {
    const [counts, recent] = await Promise.all([reviews.counts(productId), reviews.recent(productId, PRODUCT_REVIEWS)]);
    return {
      summary: ratingSummary(counts),
      reviews: recent.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        author: reviewerName(r.authorName),
        createdAt: r.createdAt,
      })),
    };
  };
}

export function makeGetOrderReviews(deps: { identity: Identity; orders: OrderRepository; reviews: ReviewRepository }) {
  return async (code: string): Promise<ReviewableItem[] | null> => {
    const actor = await currentActor(deps.identity);
    if (actor.kind !== "customer") return null;
    const order = await deps.orders.byCode(code.toUpperCase());
    if (!order || order.customerId !== actor.id || order.status !== "completed") return null;
    const products = [...new Map(order.lines.map((l) => [l.productId, l.productName])).entries()];
    const mine = await deps.reviews.mine(
      actor.id,
      products.map(([id]) => id),
    );
    return products.map(([productId, productName]) => {
      const review = mine.find((r) => r.productId === productId);
      return { productId, productName, mine: review ? { rating: review.rating, body: review.body, isHidden: review.isHidden } : null };
    });
  };
}

export function makeSubmitReview(deps: {
  identity: Identity;
  reviews: ReviewRepository;
  catalog: CatalogRepository;
  onChange: (slug: string) => void;
}) {
  return async (input: { productId: string; rating: number; body: string | null }): Promise<SubmitReviewResult> => {
    const actor = await currentActor(deps.identity);
    if (actor.kind !== "customer" || !can(actor, "reviews.write")) return { status: "forbidden" };
    const review = normaliseReview(input);
    const errors = reviewErrors(review);
    if (Object.keys(errors).length > 0) return { status: "invalid", errors };
    const purchased = await deps.reviews.purchased(actor.id, [input.productId]);
    if (!purchased.includes(input.productId)) return { status: "forbidden" };
    await deps.reviews.save({ productId: input.productId, userId: actor.id as UserId, rating: review.rating, body: review.body });
    const product = (await deps.catalog.all()).find((p) => p.id === input.productId);
    if (product) deps.onChange(product.slug);
    return { status: "saved" };
  };
}

export function makeListReviewsForStaff(deps: { identity: Identity; reviews: ReviewRepository }) {
  return async (before: Date | null = null): Promise<{ reviews: StaffReview[]; canModerate: boolean; hasMore: boolean } | null> => {
    const actor = await currentActor(deps.identity);
    if (!isStaff(actor)) return null;
    const page = await deps.reviews.forStaff(STAFF_REVIEW_PAGE + 1, before);
    return {
      reviews: page.slice(0, STAFF_REVIEW_PAGE),
      canModerate: can(actor, "reviews.moderate"),
      hasMore: page.length > STAFF_REVIEW_PAGE,
    };
  };
}

export function makeSetReviewHidden(deps: {
  identity: Identity;
  reviews: ReviewRepository;
  catalog: CatalogRepository;
  onChange: (slug: string) => void;
}) {
  return async (id: string, hidden: boolean): Promise<"done" | "forbidden" | "not_found"> => {
    if (!can(await currentActor(deps.identity), "reviews.moderate")) return "forbidden";
    const productId = await deps.reviews.setHidden(id, hidden);
    if (!productId) return "not_found";
    const product = (await deps.catalog.all()).find((p) => p.id === productId);
    if (product) deps.onChange(product.slug);
    return "done";
  };
}
