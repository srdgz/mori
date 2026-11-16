import "server-only";
import { cache } from "react";
import { makeListAddresses, makeRemoveAddress, makeSaveAddress } from "@/core/application/account/addresses";
import { makeListFavourites, makeToggleFavourite } from "@/core/application/account/favourites";
import { makeChangePassword, makeDeleteAccount, makeUpdateProfile } from "@/core/application/account/profile";
import { currentActor, makeRequestPasswordReset, makeResetPassword, makeSignIn, makeSignUp } from "@/core/application/account/session";
import { makeGetMenu } from "@/core/application/catalog/get-menu";
import { makeGetProduct } from "@/core/application/catalog/get-product";
import { makeSubmitContactMessage } from "@/core/application/contact/submit-contact-message";
import { makeGetStoreInfo } from "@/core/application/store/get-store-info";
import { systemClock } from "@/infrastructure/clock";
import { getDatabase } from "@/infrastructure/db/client";
import { DrizzleAddressRepository, DrizzleFavouriteRepository } from "@/infrastructure/db/drizzle-account-repositories";
import { DrizzleCatalogRepository } from "@/infrastructure/db/drizzle-catalog-repository";
import { DrizzleRateLimiter } from "@/infrastructure/db/drizzle-rate-limiter";
import { MemoryContactInbox } from "@/infrastructure/memory/memory-contact-inbox";
import { MemoryStoreRepository } from "@/infrastructure/memory/memory-store-repository";
import { getIdentity, getMailer } from "./auth";

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

function buildAccount() {
  const db = getDatabase();
  const identity = getIdentity();
  const catalog = new DrizzleCatalogRepository(db);
  const limiter = new DrizzleRateLimiter(db, systemClock);
  const addresses = new DrizzleAddressRepository(db);
  const favourites = new DrizzleFavouriteRepository(db);
  return {
    identity,
    currentActor: () => currentActor(identity),
    signUp: makeSignUp(identity, limiter),
    signIn: makeSignIn(identity, limiter),
    requestPasswordReset: makeRequestPasswordReset(identity, limiter),
    resetPassword: makeResetPassword(identity),
    updateProfile: makeUpdateProfile(identity),
    changePassword: makeChangePassword(identity, getMailer()),
    deleteAccount: makeDeleteAccount(identity),
    listAddresses: makeListAddresses(identity, addresses),
    saveAddress: makeSaveAddress(identity, addresses),
    removeAddress: makeRemoveAddress(identity, addresses),
    listFavourites: makeListFavourites(identity, favourites, catalog),
    toggleFavourite: makeToggleFavourite(identity, favourites, catalog),
  };
}

export type Container = ReturnType<typeof build>;

export const container = cache(build);

export const account = cache(buildAccount);
