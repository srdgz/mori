export const REVIEW_MAX_LENGTH = 280;

export type RatingCounts = readonly [number, number, number, number, number];

export type RatingSummary = Readonly<{ count: number; average: number; counts: RatingCounts }>;

export type ReviewInput = Readonly<{ rating: number; body: string | null }>;

export type ReviewError = Readonly<{ rating?: "range"; body?: "too_long" }>;

export function normaliseReview(input: ReviewInput): ReviewInput {
  const body = input.body?.trim().replace(/\s+/g, " ") ?? "";
  return { rating: input.rating, body: body.length > 0 ? body : null };
}

export function reviewErrors(input: ReviewInput): ReviewError {
  const errors: { rating?: "range"; body?: "too_long" } = {};
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) errors.rating = "range";
  if (input.body && input.body.length > REVIEW_MAX_LENGTH) errors.body = "too_long";
  return errors;
}

export function ratingSummary(counts: RatingCounts): RatingSummary {
  const count = counts.reduce((sum, n) => sum + n, 0);
  const total = counts.reduce((sum, n, i) => sum + n * (i + 1), 0);
  return { count, average: count === 0 ? 0 : Math.round((total / count) * 10) / 10, counts };
}

export function reviewerName(fullName: string): string {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  if (!first) return "";
  const last = rest[0];
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}
