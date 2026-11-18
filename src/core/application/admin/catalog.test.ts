import { beforeEach, describe, expect, it } from "vitest";
import { MemoryAdminCatalogRepository } from "@/infrastructure/memory/memory-admin-catalog";
import { MemoryIdentity } from "@/infrastructure/memory/memory-identity";
import { productDraft } from "@/test/admin-catalog-contract";
import {
  makeGetProductDraft,
  makeListAdminProducts,
  makeSaveProduct,
  makeSetOptionAvailability,
  makeSetProductAvailability,
} from "./catalog";

let catalog: MemoryAdminCatalogRepository;
let identity: MemoryIdentity;
let changes: number;
const onChange = () => {
  changes += 1;
};

beforeEach(() => {
  catalog = new MemoryAdminCatalogRepository(undefined, [
    {
      id: "grp-milk",
      code: "milk",
      name: { es: "Leche", en: "Milk" },
      required: false,
      options: [{ id: "opt-oat", code: "oat", name: { es: "Avena", en: "Oat" }, priceDeltaCents: 40, isAvailable: true }],
    },
  ]);
  identity = new MemoryIdentity();
  changes = 0;
});

function signIn(role: "admin" | "staff") {
  identity.signInAs(identity.addUser({ email: `${role}@example.com` }, role));
}

describe("SaveProduct", () => {
  it("lets an admin create a drink and refreshes the menu", async () => {
    signIn("admin");
    const result = await makeSaveProduct({ catalog, identity, onChange })(productDraft({ categoryId: "cat-signature" }));
    expect(result).toEqual({ ok: true, id: "product-1" });
    expect(changes).toBe(1);
    expect(await makeListAdminProducts({ catalog, identity })()).toMatchObject({ products: [{ id: "product-1" }] });
  });

  it("says which fields to fix and refuses a taken slug", async () => {
    signIn("admin");
    const save = makeSaveProduct({ catalog, identity, onChange });
    expect(await save(productDraft({ categoryId: "cat-signature", priceCents: 0, name: "" }))).toEqual({
      ok: false,
      error: "invalid",
      fields: ["name", "price"],
    });
    const first = productDraft({ categoryId: "cat-signature" });
    await save(first);
    expect(await save(productDraft({ categoryId: "cat-signature", slug: first.slug }))).toEqual({
      ok: false,
      error: "slug_taken",
      fields: ["slug"],
    });
    expect(changes).toBe(1);
  });

  it("is only for admins", async () => {
    signIn("staff");
    expect(await makeSaveProduct({ catalog, identity, onChange })(productDraft({ categoryId: "cat-signature" }))).toEqual({
      ok: false,
      error: "forbidden",
      fields: [],
    });
    expect(await makeListAdminProducts({ catalog, identity })()).toBeNull();
    expect(await makeGetProductDraft({ catalog, identity })(null)).toBeNull();
    expect(await makeSetProductAvailability({ catalog, identity, onChange })("product-1", false)).toBe(false);
    expect(await makeSetOptionAvailability({ catalog, identity, onChange })("opt-oat", false)).toBe(false);
  });
});

describe("GetProductDraft", () => {
  it("gives an empty form or an existing drink with its choices", async () => {
    signIn("admin");
    const get = makeGetProductDraft({ catalog, identity });
    expect(await get(null)).toMatchObject({ draft: null, categories: [{ id: "cat-signature" }], groups: [{ id: "grp-milk" }] });
    const saved = await makeSaveProduct({ catalog, identity, onChange })(productDraft({ categoryId: "cat-signature" }));
    if (!saved.ok) throw new Error(saved.error);
    expect((await get(saved.id))?.draft?.id).toBe(saved.id);
    expect(await get("missing")).toBeNull();
  });
});

describe("availability", () => {
  it("marks a drink or an option as sold out and refreshes the menu only when something changed", async () => {
    signIn("admin");
    const saved = await makeSaveProduct({ catalog, identity, onChange })(productDraft({ categoryId: "cat-signature" }));
    if (!saved.ok) throw new Error(saved.error);
    const setProduct = makeSetProductAvailability({ catalog, identity, onChange });
    const setOption = makeSetOptionAvailability({ catalog, identity, onChange });
    expect(await setProduct(saved.id, false)).toBe(true);
    expect(await setProduct("missing", false)).toBe(false);
    expect(await setOption("opt-oat", false)).toBe(true);
    expect(await setOption("missing", false)).toBe(false);
    expect(changes).toBe(3);
    expect((await catalog.optionGroups())[0]?.options[0]?.isAvailable).toBe(false);
  });
});
