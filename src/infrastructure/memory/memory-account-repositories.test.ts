import type { UserId } from "@/core/domain/access/actor";
import type { ProductId } from "@/core/domain/catalog/product";
import { accountRepositoriesContract } from "@/test/account-contract";
import { MemoryAddressRepository, MemoryFavouriteRepository, MemoryPreferenceRepository } from "./memory-account-repositories";

accountRepositoriesContract("Memory", async () => ({
  users: ["u1" as UserId, "u2" as UserId],
  addresses: new MemoryAddressRepository(),
  favourites: new MemoryFavouriteRepository(),
  preferences: new MemoryPreferenceRepository(),
  products: ["p1" as ProductId, "p2" as ProductId],
}));
