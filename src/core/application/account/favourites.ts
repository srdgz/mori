import { sortForMenu, type Product } from "@/core/domain/catalog/product";
import type { FavouriteRepository } from "../ports/account-repositories";
import type { CatalogRepository } from "../ports/catalog-repository";
import type { Identity } from "../ports/identity";
import { requireUser } from "./session";

export function makeListFavourites(identity: Identity, favourites: FavouriteRepository, catalog: CatalogRepository) {
  return async (): Promise<Product[]> => {
    const user = await requireUser(identity, "account.manage");
    const ids = new Set(await favourites.forUser(user.id));
    return sortForMenu((await catalog.all()).filter((p) => ids.has(p.id)));
  };
}

export function makeToggleFavourite(identity: Identity, favourites: FavouriteRepository, catalog: CatalogRepository) {
  return async (slug: string): Promise<"added" | "removed" | "not_found"> => {
    const user = await requireUser(identity, "account.manage");
    const product = await catalog.bySlug(slug);
    if (!product) return "not_found";
    const current = await favourites.forUser(user.id);
    if (current.includes(product.id)) {
      await favourites.remove(user.id, product.id);
      return "removed";
    }
    await favourites.add(user.id, product.id);
    return "added";
  };
}
