import type { UserId } from "@/core/domain/access/actor";
import type { Address, AddressDraft, AddressId } from "@/core/domain/account/address";
import type { ProductId } from "@/core/domain/catalog/product";

export interface AddressRepository {
  forUser(userId: UserId): Promise<Address[]>;
  create(userId: UserId, draft: AddressDraft): Promise<Address>;
  update(userId: UserId, id: AddressId, draft: AddressDraft): Promise<Address | null>;
  remove(userId: UserId, id: AddressId): Promise<boolean>;
}

export interface FavouriteRepository {
  forUser(userId: UserId): Promise<ProductId[]>;
  add(userId: UserId, productId: ProductId): Promise<void>;
  remove(userId: UserId, productId: ProductId): Promise<void>;
}
