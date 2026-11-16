import "server-only";
import { cache } from "react";
import { makeGetMenu } from "@/core/application/catalog/get-menu";
import { makeGetProduct } from "@/core/application/catalog/get-product";
import { makeSubmitContactMessage } from "@/core/application/contact/submit-contact-message";
import { makeGetStoreInfo } from "@/core/application/store/get-store-info";
import { systemClock } from "@/infrastructure/clock";
import { getDatabase } from "@/infrastructure/db/client";
import { DrizzleCatalogRepository } from "@/infrastructure/db/drizzle-catalog-repository";
import { MemoryContactInbox } from "@/infrastructure/memory/memory-contact-inbox";
import { MemoryStoreRepository } from "@/infrastructure/memory/memory-store-repository";

const contactInbox = new MemoryContactInbox();

function build() {
  const catalog = new DrizzleCatalogRepository(getDatabase());
  const store = new MemoryStoreRepository();
  return {
    getMenu: makeGetMenu(catalog),
    getProduct: makeGetProduct(catalog),
    getStoreInfo: makeGetStoreInfo(store),
    submitContactMessage: makeSubmitContactMessage(contactInbox, systemClock),
  };
}

export type Container = ReturnType<typeof build>;

export const container = cache(build);
