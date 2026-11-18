import { beforeEach, describe, expect, it } from "vitest";
import type { UserId } from "@/core/domain/access/actor";
import { MemoryOrderRepository, MemorySettingsRepository } from "@/infrastructure/memory/memory-checkout";
import { MemoryIdentity } from "@/infrastructure/memory/memory-identity";
import { makeGetLoyaltyCard } from "./loyalty";

let identity: MemoryIdentity;
let orders: MemoryOrderRepository;

beforeEach(() => {
  identity = new MemoryIdentity();
  orders = new MemoryOrderRepository();
});

describe("GetLoyaltyCard", () => {
  it("shows a customer's stamps against the shop's goal", async () => {
    const user = identity.addUser({ email: "ana@example.com" });
    identity.signInAs(user);
    orders.ledger.push({ userId: user.id as UserId, orderId: null, delta: 5, reason: "adjustment" });
    const card = await makeGetLoyaltyCard({ identity, loyalty: orders, settings: new MemorySettingsRepository() })();
    expect(card).toEqual({ stamps: 5, required: 8, filled: 5, missing: 3, canRedeem: false });
  });

  it("has no card for visitors or the team", async () => {
    const get = makeGetLoyaltyCard({ identity, loyalty: orders, settings: new MemorySettingsRepository() });
    expect(await get()).toBeNull();
    identity.signInAs(identity.addUser({ email: "staff@example.com" }, "staff"));
    expect(await get()).toBeNull();
  });
});
