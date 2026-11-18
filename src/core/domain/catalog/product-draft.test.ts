import { describe, expect, it } from "vitest";
import { draftErrors, slugify, type ProductDraft } from "./product-draft";

const text = { es: "Texto", en: "Text" };
const draft: ProductDraft = {
  id: null,
  slug: "hojicha-latte",
  categoryId: "cat",
  name: "Hojicha Latte",
  image: "classic",
  priceCents: 490,
  cupColor: "#a0522d",
  cupName: text,
  shortDescription: text,
  description: text,
  alt: text,
  isVegan: true,
  isAvailable: true,
  isFeatured: false,
  sort: 7,
  groups: [{ groupId: "size", defaultOptionId: "regular" }],
};

describe("slugify", () => {
  it("turns a drink name into a clean address", () => {
    expect(slugify("  Matcha Tónico de Yuzu! ")).toBe("matcha-tonico-de-yuzu");
    expect(slugify("Café & Matcha")).toBe("cafe-matcha");
  });
});

describe("draftErrors", () => {
  it("accepts a complete drink", () => {
    expect(draftErrors(draft)).toEqual([]);
  });

  it("points at every field that needs fixing", () => {
    expect(
      draftErrors({
        ...draft,
        name: "X",
        slug: "Bad Slug",
        priceCents: 20,
        cupColor: "green",
        shortDescription: { es: "", en: "x" },
        description: { es: "x", en: " " },
        alt: { es: "", en: "" },
        image: " ",
        categoryId: "",
      }),
    ).toEqual(["name", "slug", "price", "cupColor", "shortDescription", "description", "alt", "image", "category"]);
  });

  it("rejects prices that are not whole cents or too high", () => {
    expect(draftErrors({ ...draft, priceCents: 4.5 })).toEqual(["price"]);
    expect(draftErrors({ ...draft, priceCents: 9000 })).toEqual(["price"]);
  });
});
