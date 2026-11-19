import type { AddressRepository, FavouriteRepository } from "@/core/application/ports/account-repositories";
import type { UserId } from "@/core/domain/access/actor";
import { withDefault, type Address, type AddressDraft, type AddressId } from "@/core/domain/account/address";
import type { ProductId } from "@/core/domain/catalog/product";

export class MemoryAddressRepository implements AddressRepository {
  private rows: Address[] = [];
  private counter = 0;

  async forUser(userId: UserId): Promise<Address[]> {
    return this.rows.filter((a) => a.userId === userId);
  }

  private normalise(userId: UserId, defaultId: AddressId | null): void {
    const mine = withDefault(
      this.rows.filter((a) => a.userId === userId),
      defaultId,
    );
    this.rows = [...this.rows.filter((a) => a.userId !== userId), ...mine];
  }

  async create(userId: UserId, draft: AddressDraft): Promise<Address> {
    this.counter += 1;
    const address: Address = { ...draft, id: `address-${this.counter}` as AddressId, userId };
    this.rows.push(address);
    this.normalise(userId, draft.isDefault ? address.id : null);
    return this.rows.find((a) => a.id === address.id)!;
  }

  async update(userId: UserId, id: AddressId, draft: AddressDraft): Promise<Address | null> {
    const index = this.rows.findIndex((a) => a.id === id && a.userId === userId);
    if (index === -1) return null;
    this.rows[index] = { ...draft, id, userId };
    this.normalise(userId, draft.isDefault ? id : null);
    return this.rows.find((a) => a.id === id)!;
  }

  async remove(userId: UserId, id: AddressId): Promise<boolean> {
    const before = this.rows.length;
    this.rows = this.rows.filter((a) => !(a.id === id && a.userId === userId));
    this.normalise(userId, null);
    return this.rows.length < before;
  }
}

export class MemoryFavouriteRepository implements FavouriteRepository {
  private readonly rows = new Map<UserId, ProductId[]>();

  async forUser(userId: UserId): Promise<ProductId[]> {
    return [...(this.rows.get(userId) ?? [])];
  }

  async add(userId: UserId, productId: ProductId): Promise<void> {
    const current = this.rows.get(userId) ?? [];
    if (!current.includes(productId)) this.rows.set(userId, [...current, productId]);
  }

  async remove(userId: UserId, productId: ProductId): Promise<void> {
    this.rows.set(
      userId,
      (this.rows.get(userId) ?? []).filter((id) => id !== productId),
    );
  }
}
