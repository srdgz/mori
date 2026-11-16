import type { StoreRepository } from "@/core/application/ports/store-repository";
import type { StoreInfo } from "@/core/domain/store/store-info";

const weekday = { opens: "08:00", closes: "20:00" } as const;
const weekend = { opens: "09:30", closes: "20:30" } as const;

export const storeSeed: StoreInfo = {
  name: "MŌRI Matcha Bar & Culture",
  address: { street: "C/ Espíritu Santo, 18", postalCode: "28004", city: "Madrid", country: "ES" },
  email: "hola@morimatchabar.com",
  phone: "+34 910 000 000",
  instagram: "@mori.matchabar",
  timeZone: "Europe/Madrid",
  schedule: { 0: weekend, 1: weekday, 2: weekday, 3: weekday, 4: weekday, 5: weekday, 6: weekend },
};

export class MemoryStoreRepository implements StoreRepository {
  constructor(private readonly store: StoreInfo = storeSeed) {}

  async info(): Promise<StoreInfo> {
    return this.store;
  }
}
