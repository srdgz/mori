import { describe, expect, it } from "vitest";
import type { UserId } from "../access/actor";
import { sortAddresses, validateAddress, withDefault, type Address, type AddressId } from "./address";

const input = {
  label: " Casa ",
  line1: "C/ del Pez,  12",
  line2: " ",
  postalCode: " 28004 ",
  city: "Madrid",
  instructions: "",
  isDefault: false,
};

function address(id: string, label: string, isDefault = false): Address {
  return {
    id: id as AddressId,
    userId: "u1" as UserId,
    label,
    line1: "x",
    line2: null,
    postalCode: "28004",
    city: "Madrid",
    instructions: null,
    isDefault,
  };
}

describe("validateAddress", () => {
  it("cleans the fields and turns empty optional fields into null", () => {
    expect(validateAddress(input)).toEqual({
      ok: true,
      value: {
        label: "Casa",
        line1: "C/ del Pez, 12",
        line2: null,
        postalCode: "28004",
        city: "Madrid",
        instructions: null,
        isDefault: false,
      },
    });
  });

  it("keeps optional fields that have content", () => {
    const result = validateAddress({ ...input, line2: " 2º  B ", instructions: "Timbre roto" });
    expect(result.ok && [result.value.line2, result.value.instructions]).toEqual(["2º B", "Timbre roto"]);
  });

  it("reports missing and invalid fields", () => {
    expect(validateAddress({ ...input, label: "", line1: " ", postalCode: "2800", city: "" })).toEqual({
      ok: false,
      errors: { label: "required", line1: "required", postalCode: "invalid", city: "required" },
    });
  });

  it("limits the label length", () => {
    const result = validateAddress({ ...input, label: "x".repeat(41) });
    expect(result).toEqual({ ok: false, errors: { label: "too_long" } });
  });
});

describe("withDefault", () => {
  const list = [address("a", "Casa"), address("b", "Oficina", true)];

  it("moves the default to the chosen address", () => {
    expect(withDefault(list, "a" as AddressId).map((a) => a.isDefault)).toEqual([true, false]);
  });

  it("keeps the current default when none is chosen", () => {
    expect(withDefault(list, null).map((a) => a.isDefault)).toEqual([false, true]);
  });

  it("makes the first address the default when there is none", () => {
    expect(withDefault([address("a", "Casa"), address("b", "Oficina")], null).map((a) => a.isDefault)).toEqual([true, false]);
  });

  it("handles an empty list", () => {
    expect(withDefault([], null)).toEqual([]);
  });
});

describe("sortAddresses", () => {
  it("puts the default first, then sorts by label", () => {
    const sorted = sortAddresses([address("c", "Oficina"), address("a", "Casa"), address("b", "Zona", true)]);
    expect(sorted.map((a) => a.label)).toEqual(["Zona", "Casa", "Oficina"]);
  });
});
