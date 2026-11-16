import type { StoreInfo } from "@/core/domain/store/store-info";

export interface StoreRepository {
  info(): Promise<StoreInfo>;
}
