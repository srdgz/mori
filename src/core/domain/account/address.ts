import type { UserId } from "../access/actor";
import type { FieldErrors, Validation } from "./account";

export type AddressId = string & { readonly __brand: "AddressId" };

export type Address = Readonly<{
  id: AddressId;
  userId: UserId;
  label: string;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  instructions: string | null;
  isDefault: boolean;
}>;

export type AddressDraft = Omit<Address, "id" | "userId">;

export type AddressInput = {
  label: string;
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
  instructions: string;
  isDefault: boolean;
};

type AddressField = "label" | "line1" | "postalCode" | "city";

const POSTAL_CODE = /^[0-9]{5}$/;

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function optional(value: string): string | null {
  const cleaned = clean(value);
  return cleaned === "" ? null : cleaned;
}

export function validateAddress(input: AddressInput): Validation<AddressDraft, AddressField> {
  const draft: AddressDraft = {
    label: clean(input.label),
    line1: clean(input.line1),
    line2: optional(input.line2),
    postalCode: input.postalCode.trim(),
    city: clean(input.city),
    instructions: optional(input.instructions),
    isDefault: input.isDefault,
  };
  const errors: FieldErrors<AddressField> = {};
  if (draft.label === "" || draft.label.length > 40) errors.label = draft.label === "" ? "required" : "too_long";
  if (draft.line1 === "") errors.line1 = "required";
  if (!POSTAL_CODE.test(draft.postalCode)) errors.postalCode = "invalid";
  if (draft.city === "") errors.city = "required";
  return Object.keys(errors).length === 0 ? { ok: true, value: draft } : { ok: false, errors };
}

export function withDefault(addresses: readonly Address[], defaultId: AddressId | null): Address[] {
  const chosen = defaultId ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null;
  return addresses.map((a) => ({ ...a, isDefault: a.id === chosen }));
}

export function sortAddresses(addresses: readonly Address[]): Address[] {
  return [...addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.label.localeCompare(b.label));
}
