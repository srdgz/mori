import "server-only";
import { cache } from "react";
import { makeGetMenu } from "@/core/application/catalog/get-menu";
import { makeSubmitContactMessage } from "@/core/application/contact/submit-contact-message";
import { makeGetStoreInfo } from "@/core/application/store/get-store-info";
import { systemClock } from "@/infrastructure/clock";
import { catalogSeed } from "@/infrastructure/memory/catalog-seed";
import { MemoryCatalogRepository } from "@/infrastructure/memory/memory-catalog-repository";
import { MemoryContactInbox } from "@/infrastructure/memory/memory-contact-inbox";
import { MemoryStoreRepository } from "@/infrastructure/memory/memory-store-repository";

const contactInbox = new MemoryContactInbox();

function build() {
  const catalog = new MemoryCatalogRepository(catalogSeed);
  const store = new MemoryStoreRepository();
  return {
    getMenu: makeGetMenu(catalog),
    getStoreInfo: makeGetStoreInfo(store),
    submitContactMessage: makeSubmitContactMessage(contactInbox, systemClock),
  };
}

export type Container = ReturnType<typeof build>;

export const container = cache(build);
