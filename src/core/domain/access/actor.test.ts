import { describe, expect, it } from "vitest";
import {
  actorFor,
  authorize,
  can,
  canHandleOrder,
  canViewOrder,
  GUEST,
  isDemo,
  isStaff,
  type Actor,
  type Permission,
  type UserId,
} from "./actor";

const customer = actorFor({ id: "c1", role: "customer", isDemo: false });
const staff = actorFor({ id: "s1", role: "staff", isDemo: false });
const demoStaff = actorFor({ id: "s2", role: "staff", isDemo: true });
const demoCustomer = actorFor({ id: "c9", role: "customer", isDemo: true });
const admin = actorFor({ id: "a1", role: "admin", isDemo: false });

const all: Permission[] = [
  "account.manage",
  "account.credentials",
  "loyalty.redeem",
  "orders.board",
  "orders.advance",
  "orders.refund",
  "catalog.manage",
  "settings.manage",
  "coupons.manage",
  "customers.view",
  "dashboard.view",
];

function allowed(actor: Actor): Permission[] {
  return all.filter((permission) => can(actor, permission));
}

describe("actorFor", () => {
  it("maps each role to its actor", () => {
    expect(customer).toEqual({ kind: "customer", id: "c1", demo: false });
    expect(staff).toEqual({ kind: "staff", id: "s1", demo: false });
    expect(admin).toEqual({ kind: "admin", id: "a1" });
  });
});

describe("can", () => {
  it("gives a guest nothing", () => {
    expect(allowed(GUEST)).toEqual([]);
  });

  it("lets a customer manage their account and redeem stamps", () => {
    expect(allowed(customer)).toEqual(["account.manage", "account.credentials", "loyalty.redeem"]);
  });

  it("lets staff work the order board but not run the shop", () => {
    expect(allowed(staff)).toEqual(["account.manage", "account.credentials", "orders.board", "orders.advance"]);
  });

  it("stops the shared demo staff account from changing its own credentials", () => {
    expect(allowed(demoStaff)).toEqual(["account.manage", "orders.board", "orders.advance"]);
  });

  it("lets the shared demo customer use the account but not change its credentials", () => {
    expect(allowed(demoCustomer)).toEqual(["account.manage", "loyalty.redeem"]);
  });

  it("knows which actors are shared demo accounts", () => {
    expect([customer, demoCustomer, staff, demoStaff, admin, GUEST].map(isDemo)).toEqual([false, true, false, true, false, false]);
  });

  it("lets an admin run the whole shop, without the customer loyalty card", () => {
    expect(allowed(admin)).toEqual(all.filter((p) => p !== "loyalty.redeem"));
  });
});

describe("authorize", () => {
  it("passes when the permission is granted", () => {
    expect(() => authorize(admin, "catalog.manage")).not.toThrow();
  });

  it("throws access.denied otherwise", () => {
    expect(() => authorize(staff, "catalog.manage")).toThrow(expect.objectContaining({ code: "access.denied" }));
  });
});

describe("canViewOrder", () => {
  const order = { customerId: "c1" as UserId, trackingToken: "token" };
  const guestOrder = { customerId: null, trackingToken: "token" };

  it("lets the customer who placed it see it", () => {
    expect(canViewOrder(customer, order)).toBe(true);
  });

  it("hides it from other customers", () => {
    expect(canViewOrder(actorFor({ id: "c2", role: "customer", isDemo: false }), order)).toBe(false);
  });

  it("lets anyone with the tracking link see it", () => {
    expect(canViewOrder(GUEST, guestOrder, "token")).toBe(true);
  });

  it("rejects a wrong or missing tracking token", () => {
    expect(canViewOrder(GUEST, guestOrder, "nope")).toBe(false);
    expect(canViewOrder(GUEST, guestOrder)).toBe(false);
  });

  it("lets staff and admins see every order", () => {
    expect(canViewOrder(demoStaff, guestOrder)).toBe(true);
    expect(canViewOrder(admin, order)).toBe(true);
  });
});

describe("canHandleOrder", () => {
  const staff = actorFor({ id: "s", role: "staff", isDemo: false });
  const demoStaff = actorFor({ id: "d", role: "staff", isDemo: true });
  const admin = actorFor({ id: "a", role: "admin", isDemo: false });
  const customer = actorFor({ id: "c", role: "customer", isDemo: false });

  it("lets staff move any order and the demo staff only example orders", () => {
    expect(canHandleOrder(staff, "orders.advance", { isDemo: false })).toBe(true);
    expect(canHandleOrder(demoStaff, "orders.advance", { isDemo: true })).toBe(true);
    expect(canHandleOrder(demoStaff, "orders.advance", { isDemo: false })).toBe(false);
    expect(canHandleOrder(customer, "orders.advance", { isDemo: true })).toBe(false);
  });

  it("keeps refunds for admins", () => {
    expect(canHandleOrder(admin, "orders.refund", { isDemo: false })).toBe(true);
    expect(canHandleOrder(staff, "orders.refund", { isDemo: false })).toBe(false);
  });

  it("knows who works in the shop", () => {
    expect(isStaff(staff)).toBe(true);
    expect(isStaff(admin)).toBe(true);
    expect(isStaff(customer)).toBe(false);
    expect(isStaff(GUEST)).toBe(false);
  });
});
