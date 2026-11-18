import { describe, expect, it } from "vitest";
import { normaliseReview, ratingSummary, reviewErrors, reviewerName } from "./review";

describe("reviews", () => {
  it("trims the text and drops an empty one", () => {
    expect(normaliseReview({ rating: 5, body: "  Con avena,\n\n perfecto  " })).toEqual({ rating: 5, body: "Con avena, perfecto" });
    expect(normaliseReview({ rating: 4, body: "   " })).toEqual({ rating: 4, body: null });
    expect(normaliseReview({ rating: 4, body: null })).toEqual({ rating: 4, body: null });
  });

  it("accepts one to five stars and up to 280 characters", () => {
    expect(reviewErrors({ rating: 5, body: "Rico" })).toEqual({});
    expect(reviewErrors({ rating: 0, body: null })).toEqual({ rating: "range" });
    expect(reviewErrors({ rating: 4.5, body: "x".repeat(281) })).toEqual({ rating: "range", body: "too_long" });
  });

  it("summarises ratings with one decimal", () => {
    expect(ratingSummary([0, 0, 1, 2, 4])).toEqual({ count: 7, average: 4.4, counts: [0, 0, 1, 2, 4] });
    expect(ratingSummary([0, 0, 0, 0, 0])).toEqual({ count: 0, average: 0, counts: [0, 0, 0, 0, 0] });
  });

  it("shows the first name and the initial of the last one", () => {
    expect(reviewerName("Lucía Martín Pérez")).toBe("Lucía M.");
    expect(reviewerName(" ana  lópez ")).toBe("ana L.");
    expect(reviewerName("Kai")).toBe("Kai");
    expect(reviewerName("  ")).toBe("");
  });
});
