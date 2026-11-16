import { describe, expect, it } from "vitest";
import { MemoryCatalogRepository } from "@/infrastructure/memory/memory-catalog-repository";
import { catalogSeed } from "@/infrastructure/seed/catalog";
import { product } from "@/test/catalog";
import { makeGetMenu } from "./get-menu";

describe("GetMenu", () => {
  it("returns available products ordered by their sort position", async () => {
    const getMenu = makeGetMenu(
      new MemoryCatalogRepository([
        product({ slug: "c", sort: 3 }),
        product({ slug: "a", sort: 1 }),
        product({ slug: "hidden", sort: 0, isAvailable: false }),
        product({ slug: "b", sort: 2 }),
      ]),
    );
    expect((await getMenu()).map((p) => p.slug)).toEqual(["a", "b", "c"]);
  });

  it("can return only featured products", async () => {
    const getMenu = makeGetMenu(
      new MemoryCatalogRepository([product({ slug: "a", sort: 1, isFeatured: true }), product({ slug: "b", sort: 2 })]),
    );
    expect((await getMenu({ featuredOnly: true })).map((p) => p.slug)).toEqual(["a"]);
  });

  it("breaks ties in sort position alphabetically", async () => {
    const getMenu = makeGetMenu(new MemoryCatalogRepository([product({ slug: "b", sort: 1 }), product({ slug: "a", sort: 1 })]));
    expect((await getMenu()).map((p) => p.slug)).toEqual(["a", "b"]);
  });

  it("serves the six signature drinks with the menu prices", async () => {
    const menu = await makeGetMenu(new MemoryCatalogRepository(catalogSeed))();
    expect(menu.map((p) => [p.slug, p.price.cents])).toEqual([
      ["classic-matcha", 450],
      ["strawberry-matcha", 540],
      ["vanilla-matcha", 520],
      ["coconut-matcha", 540],
      ["dirty-matcha", 560],
      ["iced-mango-matcha", 560],
    ]);
  });
});
