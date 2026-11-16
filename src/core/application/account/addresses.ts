import { sortAddresses, validateAddress, type Address, type AddressId, type AddressInput } from "@/core/domain/account/address";
import type { AddressRepository } from "../ports/account-repositories";
import type { Identity } from "../ports/identity";
import { requireUser, type FormResult } from "./session";

export const MAX_ADDRESSES = 10;

export function makeListAddresses(identity: Identity, addresses: AddressRepository) {
  return async (): Promise<Address[]> => {
    const user = await requireUser(identity, "account.manage");
    return sortAddresses(await addresses.forUser(user.id));
  };
}

export function makeSaveAddress(identity: Identity, addresses: AddressRepository) {
  return async (id: AddressId | null, input: AddressInput): Promise<FormResult<"label" | "line1" | "postalCode" | "city">> => {
    const user = await requireUser(identity, "account.manage");
    const result = validateAddress(input);
    if (!result.ok) return { status: "invalid", errors: result.errors };
    if (id) {
      const updated = await addresses.update(user.id, id, result.value);
      return updated ? { status: "ok" } : { status: "failed", reason: "not_found" };
    }
    const existing = await addresses.forUser(user.id);
    if (existing.length >= MAX_ADDRESSES) return { status: "failed", reason: "limit" };
    await addresses.create(user.id, { ...result.value, isDefault: result.value.isDefault || existing.length === 0 });
    return { status: "ok" };
  };
}

export function makeRemoveAddress(identity: Identity, addresses: AddressRepository) {
  return async (id: AddressId): Promise<boolean> => {
    const user = await requireUser(identity, "account.manage");
    return addresses.remove(user.id, id);
  };
}
