import { describe, expect, it } from "vitest";
import type { AddressRepository, FavouriteRepository, PreferenceRepository } from "@/core/application/ports/account-repositories";
import type { UserId } from "@/core/domain/access/actor";
import type { AddressDraft } from "@/core/domain/account/address";
import type { ProductId } from "@/core/domain/catalog/product";

const draft: AddressDraft = {
  label: "Casa",
  line1: "C/ del Pez 12",
  line2: null,
  postalCode: "28004",
  city: "Madrid",
  instructions: null,
  isDefault: false,
};

type Setup = {
  preferences: PreferenceRepository;
  users: [UserId, UserId];
  addresses: AddressRepository;
  favourites: FavouriteRepository;
  products: [ProductId, ProductId];
};

export function accountRepositoriesContract(name: string, setup: () => Promise<Setup>) {
  describe(`${name} (account repositories contract)`, () => {
    it("keeps exactly one default address per customer", async () => {
      const { users, addresses } = await setup();
      const first = await addresses.create(users[0], draft);
      expect(first.isDefault).toBe(true);
      const second = await addresses.create(users[0], { ...draft, label: "Oficina", isDefault: true });
      const list = await addresses.forUser(users[0]);
      expect(list.filter((a) => a.isDefault).map((a) => a.id)).toEqual([second.id]);
    });

    it("hands the default on when the default address is removed", async () => {
      const { users, addresses } = await setup();
      const first = await addresses.create(users[0], draft);
      await addresses.create(users[0], { ...draft, label: "Oficina" });
      expect(await addresses.remove(users[0], first.id)).toBe(true);
      expect((await addresses.forUser(users[0])).map((a) => [a.label, a.isDefault])).toEqual([["Oficina", true]]);
    });

    it("updates only the owner's address", async () => {
      const { users, addresses } = await setup();
      const address = await addresses.create(users[0], draft);
      expect(await addresses.update(users[1], address.id, { ...draft, line1: "Otra" })).toBeNull();
      expect(await addresses.remove(users[1], address.id)).toBe(false);
      const updated = await addresses.update(users[0], address.id, { ...draft, line1: "Pez 14", line2: "2º B" });
      expect(updated).toMatchObject({ line1: "Pez 14", line2: "2º B", isDefault: true });
    });

    it("stores favourites once per drink", async () => {
      const { users, favourites, products } = await setup();
      await favourites.add(users[0], products[0]);
      await favourites.add(users[0], products[0]);
      await favourites.add(users[0], products[1]);
      expect(await favourites.forUser(users[0])).toEqual(products);
      expect(await favourites.forUser(users[1])).toEqual([]);
      await favourites.remove(users[0], products[0]);
      expect(await favourites.forUser(users[0])).toEqual([products[1]]);
    });

    it("remembers each customer's appearance and defaults to the system one", async () => {
      const { users, preferences } = await setup();
      expect(await preferences.theme(users[0])).toBe("system");
      await preferences.setTheme(users[0], "dark");
      expect(await preferences.theme(users[0])).toBe("dark");
      expect(await preferences.theme(users[1])).toBe("system");
    });
  });
}
