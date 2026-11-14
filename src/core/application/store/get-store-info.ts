import type { StoreInfo } from "@/core/domain/store/store-info";
import type { StoreRepository } from "../ports/store-repository";

export type GetStoreInfo = () => Promise<StoreInfo>;

export function makeGetStoreInfo(store: StoreRepository): GetStoreInfo {
  return () => store.info();
}
