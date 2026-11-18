import { describe, expect, it } from "vitest";
import type { OrderRepository } from "@/core/application/ports/checkout";
import type { ReviewRepository } from "@/core/application/ports/reviews";
import type { UserId } from "@/core/domain/access/actor";
import { newOrder } from "./order-contract";

export type ReviewSetup = { reviews: ReviewRepository; orders: OrderRepository; buyer: UserId; other: UserId };

const CLASSIC = "10000000-0000-4000-8000-000000000001";
const VANILLA = "10000000-0000-4000-8000-000000000003";
const DIRTY = "10000000-0000-4000-8000-000000000005";

async function completedOrder(orders: OrderRepository, customerId: UserId, at: Date) {
  const input = newOrder({ customerId, slotStart: at });
  const created = await orders.create(input);
  if (typeof created === "string") throw new Error(created);
  await orders.attachPayment(created.id, `pi_${input.code}`);
  await orders.confirmPayment(`pi_${input.code}`);
  for (const step of ["preparing", "ready", "completed"] as const) await orders.advance(created.id, step, null);
}

export function reviewRepositoryContract(name: string, setup: () => Promise<ReviewSetup>) {
  describe(`${name} (ReviewRepository contract)`, () => {
    it("knows which drinks a customer has received", async () => {
      const { reviews, orders, buyer, other } = await setup();
      const pending = newOrder({ customerId: other, slotStart: new Date("2031-06-02T10:00:00Z") });
      await orders.create(pending);
      await completedOrder(orders, buyer, new Date("2031-06-01T10:00:00Z"));
      expect((await reviews.purchased(buyer, [CLASSIC, VANILLA, DIRTY])).sort()).toEqual([CLASSIC, VANILLA]);
      expect(await reviews.purchased(other, [CLASSIC])).toEqual([]);
      expect(await reviews.purchased(buyer, [])).toEqual([]);
    });

    it("saves one review per customer and drink, hides it and counts only visible ones", async () => {
      const { reviews, buyer, other } = await setup();
      await reviews.save({ productId: VANILLA, userId: buyer, rating: 3, body: "Bien" });
      await reviews.save({ productId: VANILLA, userId: buyer, rating: 5, body: "Mejor con avena" });
      await reviews.save({ productId: VANILLA, userId: other, rating: 4, body: null });

      const counts = await reviews.counts(VANILLA);
      expect(counts).toEqual([0, 0, 0, 1, 1]);
      const recent = await reviews.recent(VANILLA, 10);
      expect(recent).toHaveLength(2);
      const mine = await reviews.mine(buyer, [VANILLA, DIRTY]);
      expect(mine).toMatchObject([{ productId: VANILLA, rating: 5, body: "Mejor con avena", isHidden: false }]);
      expect(await reviews.mine(buyer, [])).toEqual([]);

      expect(await reviews.setHidden(mine[0]!.id, true)).toBe(VANILLA);
      expect(await reviews.counts(VANILLA)).toEqual([0, 0, 0, 1, 0]);
      expect((await reviews.recent(VANILLA, 10)).map((r) => r.rating)).toEqual([4]);
      expect(await reviews.setHidden("00000000-0000-4000-8000-000000000999", true)).toBeNull();

      const staff = await reviews.forStaff(10, null);
      const hidden = staff.find((r) => r.id === mine[0]!.id);
      expect(hidden).toMatchObject({ isHidden: true, productName: "Vanilla Matcha", rating: 5 });
      expect(hidden?.authorEmail).toContain("@");
      expect(await reviews.forStaff(10, new Date("2000-01-01T00:00:00Z"))).toEqual([]);
    });
  });
}
