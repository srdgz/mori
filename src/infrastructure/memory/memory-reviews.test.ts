import type { UserId } from "@/core/domain/access/actor";
import { reviewRepositoryContract } from "@/test/review-contract";
import { MemoryOrderRepository } from "./memory-checkout";
import { MemoryReviewRepository } from "./memory-reviews";

reviewRepositoryContract("MemoryReviewRepository", async () => {
  const orders = new MemoryOrderRepository(50);
  const names: Record<string, string> = { buyer: "Lucía Martín", other: "Kai" };
  const products: Record<string, string> = { "10000000-0000-4000-8000-000000000003": "Vanilla Matcha" };
  const reviews = new MemoryReviewRepository(
    orders,
    (id) => ({ name: names[id] ?? "", email: `${id}@example.com` }),
    (id) => products[id] ?? id,
  );
  return { reviews, orders, buyer: "buyer" as UserId, other: "other" as UserId };
});
