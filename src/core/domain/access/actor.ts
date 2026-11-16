import { DomainError } from "../shared/domain-error";

export type UserId = string & { readonly __brand: "UserId" };

export type Role = "customer" | "staff" | "admin";

export type Actor =
  | Readonly<{ kind: "guest" }>
  | Readonly<{ kind: "customer"; id: UserId; demo: boolean }>
  | Readonly<{ kind: "staff"; id: UserId; demo: boolean }>
  | Readonly<{ kind: "admin"; id: UserId }>;

export const GUEST: Actor = { kind: "guest" };

export function actorFor(user: { id: string; role: Role; isDemo: boolean }): Actor {
  const id = user.id as UserId;
  if (user.role === "admin") return { kind: "admin", id };
  if (user.role === "staff") return { kind: "staff", id, demo: user.isDemo };
  return { kind: "customer", id, demo: user.isDemo };
}

export type Permission =
  | "account.manage"
  | "account.credentials"
  | "loyalty.redeem"
  | "orders.board"
  | "orders.advance"
  | "orders.refund"
  | "catalog.manage"
  | "settings.manage"
  | "coupons.manage"
  | "customers.view"
  | "dashboard.view";

const ownAccount: readonly Permission[] = ["account.manage", "account.credentials"];
const staffPermissions: readonly Permission[] = [...ownAccount, "orders.board", "orders.advance"];

const grants: Record<Actor["kind"], readonly Permission[]> = {
  guest: [],
  customer: [...ownAccount, "loyalty.redeem"],
  staff: staffPermissions,
  admin: [...staffPermissions, "orders.refund", "catalog.manage", "settings.manage", "coupons.manage", "customers.view", "dashboard.view"],
};

const sharedDemoAccountLocks: readonly Permission[] = ["account.credentials"];

export function isDemo(actor: Actor): boolean {
  return (actor.kind === "customer" || actor.kind === "staff") && actor.demo;
}

export function can(actor: Actor, permission: Permission): boolean {
  if (isDemo(actor) && sharedDemoAccountLocks.includes(permission)) return false;
  return grants[actor.kind].includes(permission);
}

export function authorize(actor: Actor, permission: Permission): void {
  if (!can(actor, permission)) throw new DomainError("access.denied", `${actor.kind} cannot ${permission}`);
}

export type OrderAccess = Readonly<{ customerId: UserId | null; trackingToken: string }>;

export function canViewOrder(actor: Actor, order: OrderAccess, trackingToken?: string): boolean {
  if (actor.kind === "staff" || actor.kind === "admin") return true;
  if (trackingToken !== undefined && trackingToken === order.trackingToken) return true;
  return actor.kind === "customer" && order.customerId === actor.id;
}
