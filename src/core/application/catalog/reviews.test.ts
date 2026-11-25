import { beforeEach, describe, expect, it } from "vitest";
import type { UserId } from "@/core/domain/access/actor";
import { MemoryCatalogRepository } from "@/infrastructure/memory/memory-catalog-repository";
import { MemoryOrderRepository } from "@/infrastructure/memory/memory-checkout";
import { MemoryIdentity } from "@/infrastructure/memory/memory-identity";
import { MemoryReviewRepository } from "@/infrastructure/memory/memory-reviews";
import { catalogSeed } from "@/infrastructure/seed/catalog";
import { newOrder } from "@/test/order-contract";
import {
  makeGetOrderReviews,
  makeGetProductReviews,
  makeListReviewsForStaff,
  makeSetReviewHidden,
  makeSubmitReview,
  STAFF_REVIEW_PAGE,
} from "./reviews";

const CLASSIC = "10000000-0000-4000-8000-000000000001";
const VANILLA = "10000000-0000-4000-8000-000000000003";

let identity: MemoryIdentity;
let orders: MemoryOrderRepository;
let reviews: MemoryReviewRepository;
let changed: string[];
const catalog = new MemoryCatalogRepository(catalogSeed);

beforeEach(() => {
  identity = new MemoryIdentity();
  orders = new MemoryOrderRepository(50);
  reviews = new MemoryReviewRepository(orders, (id) => ({ name: id === "u-1" ? "Lucía Martín" : "Kai", email: `${id}@example.com` }));
  changed = [];
});

async function delivered(customerId: string, status: "completed" | "preparing" = "completed") {
  const input = newOrder({ customerId: customerId as UserId });
  const created = await orders.create(input);
  if (typeof created === "string") throw new Error(created);
  await orders.attachPayment(created.id, `pi_${input.code}`);
  await orders.confirmPayment(`pi_${input.code}`);
  await orders.advance(created.id, "preparing");
  if (status === "completed") {
    await orders.advance(created.id, "ready");
    await orders.advance(created.id, "completed");
  }
  return input.code;
}

function customer(id = "u-1", isDemo = false) {
  identity.signInAs(identity.addUser({ id: id as UserId, email: `${id}@example.com`, name: "Lucía Martín", isDemo }));
}

const submit = () => makeSubmitReview({ identity, reviews, catalog, onChange: (slug) => changed.push(slug) });

describe("SubmitReview", () => {
  it("publishes a review for a drink the customer received and refreshes its page", async () => {
    await delivered("u-1");
    customer();
    expect(await submit()({ productId: CLASSIC, rating: 5, body: "  Perfecta con avena " })).toEqual({ status: "saved" });
    expect(changed).toEqual(["classic-matcha"]);
    const page = await makeGetProductReviews(reviews)(CLASSIC);
    expect(page.summary).toMatchObject({ count: 1, average: 5 });
    expect(page.reviews).toMatchObject([{ rating: 5, body: "Perfecta con avena", author: "Lucía M." }]);
  });

  it("rejects bad ratings, drinks not received yet, visitors, the team and the shared demo account", async () => {
    await delivered("u-1", "preparing");
    expect(await submit()({ productId: CLASSIC, rating: 5, body: null })).toEqual({ status: "forbidden" });
    customer();
    expect(await submit()({ productId: CLASSIC, rating: 9, body: null })).toEqual({ status: "invalid", errors: { rating: "range" } });
    expect(await submit()({ productId: CLASSIC, rating: 4, body: null })).toEqual({ status: "forbidden" });
    customer("u-demo", true);
    expect(await submit()({ productId: CLASSIC, rating: 4, body: null })).toEqual({ status: "forbidden" });
    identity.signInAs(identity.addUser({ email: "staff@example.com" }, "staff"));
    expect(await submit()({ productId: CLASSIC, rating: 4, body: null })).toEqual({ status: "forbidden" });
    expect(changed).toEqual([]);
  });
});

describe("GetOrderReviews", () => {
  it("lists each drink of a completed order with the customer's own review", async () => {
    const code = await delivered("u-1");
    customer();
    await submit()({ productId: VANILLA, rating: 4, body: null });
    expect(await makeGetOrderReviews({ identity, orders, reviews })(code.toLowerCase())).toEqual({
      status: "open",
      items: [
        { productId: CLASSIC, productName: "Classic Matcha", mine: null },
        { productId: VANILLA, productName: "Vanilla Matcha", mine: { rating: 4, body: null, isHidden: false } },
      ],
    });
  });

  it("explains that drinks can be rated once the order is collected", async () => {
    const preparing = await delivered("u-1", "preparing");
    customer();
    expect(await makeGetOrderReviews({ identity, orders, reviews })(preparing)).toEqual({ status: "pending" });
  });

  it("tells the shared demo account that it can't review", async () => {
    const done = await delivered("u-demo");
    const preparing = await delivered("u-demo", "preparing");
    customer("u-demo", true);
    const get = makeGetOrderReviews({ identity, orders, reviews });
    expect(await get(done)).toEqual({ status: "demo" });
    expect(await get(preparing)).toEqual({ status: "demo" });
  });

  it("offers nothing for unpaid or cancelled orders, other people's orders or visitors", async () => {
    const preparing = await delivered("u-1", "preparing");
    const other = await delivered("u-2");
    const unpaid = newOrder({ customerId: "u-1" as UserId });
    await orders.create(unpaid);
    const get = makeGetOrderReviews({ identity, orders, reviews });
    expect(await get(preparing)).toBeNull();
    customer();
    expect(await get(unpaid.code)).toBeNull();
    expect(await get(other)).toBeNull();
    expect(await get("MR-NONE")).toBeNull();
  });
});

describe("staff moderation", () => {
  it("lets the team see reviews and hide one, which refreshes the drink page", async () => {
    await delivered("u-1");
    customer();
    await submit()({ productId: CLASSIC, rating: 1, body: "Spam" });
    changed = [];
    identity.signInAs(identity.addUser({ email: "staff@example.com" }, "staff"));
    const list = await makeListReviewsForStaff({ identity, reviews })();
    expect(list).toMatchObject({ canModerate: true, hasMore: false, reviews: [{ body: "Spam", authorEmail: "u-1@example.com" }] });
    const hide = makeSetReviewHidden({ identity, reviews, catalog, onChange: (slug) => changed.push(slug) });
    expect(await hide(list!.reviews[0]!.id, true)).toBe("done");
    expect(await hide("missing", true)).toBe("not_found");
    expect(changed).toEqual(["classic-matcha"]);
    expect((await makeGetProductReviews(reviews)(CLASSIC)).summary.count).toBe(0);
  });

  it("keeps the demo staff read-only and customers out", async () => {
    const list = makeListReviewsForStaff({ identity, reviews });
    const hide = makeSetReviewHidden({ identity, reviews, catalog, onChange: () => undefined });
    customer();
    expect(await list()).toBeNull();
    expect(await hide("x", true)).toBe("forbidden");
    identity.signInAs(identity.addUser({ email: "demo-staff@example.com", isDemo: true }, "staff"));
    expect(await list()).toMatchObject({ canModerate: false });
    expect(await hide("x", true)).toBe("forbidden");
  });

  it("pages long lists", async () => {
    for (let i = 0; i < STAFF_REVIEW_PAGE + 2; i++) {
      await reviews.save({ productId: CLASSIC, userId: `u-${i}` as UserId, rating: 5, body: null });
    }
    identity.signInAs(identity.addUser({ email: "admin@example.com" }, "admin"));
    const page = await makeListReviewsForStaff({ identity, reviews })();
    expect(page?.reviews).toHaveLength(STAFF_REVIEW_PAGE);
    expect(page?.hasMore).toBe(true);
  });
});
