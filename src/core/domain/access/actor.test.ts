import { describe, expect, it } from "vitest";
import { actorFor, authorize, can, canViewOrder, GUEST, type Actor, type Permission, type UserId } from "./actor";

const customer = actorFor({ id: "c1", role: "customer", isDemo: false });
const staff = actorFor({ id: "s1", role: "staff", isDemo: false });
const demoStaff = actorFor({ id: "s2", role: "staff", isDemo: true });
const admin = actorFor({ id: "a1", role: "admin", isDemo: false });

const all: Permission[] = [
  "account.manage",
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
    expect(customer).toEqual({ kind: "customer", id: "c1" });
    expect(staff).toEqual({ kind: "staff", id: "s1", demo: false });
    expect(admin).toEqual({ kind: "admin", id: "a1" });
  });
});

describe("can", () => {
  it("gives a guest nothing", () => {
    expect(allowed(GUEST)).toEqual([]);
  });

  it("lets a customer manage their account and redeem stamps", () => {
    expect(allowed(customer)).toEqual(["account.manage", "loyalty.redeem"]);
  });

  it("lets staff work the order board but not run the shop", () => {
    expect(allowed(staff)).toEqual(["account.manage", "orders.board", "orders.advance"]);
  });

  it("stops the shared demo staff account from changing its own credentials", () => {
    expect(allowed(demoStaff)).toEqual(["orders.board", "orders.advance"]);
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
