import type { WeeklySchedule } from "../fulfilment/opening-hours";

export type StoreInfo = Readonly<{
  name: string;
  address: Readonly<{ street: string; postalCode: string; city: string; country: string }>;
  email: string;
  phone: string;
  instagram: string;
  timeZone: string;
  schedule: WeeklySchedule;
}>;

export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/\s/g, "")}`;
}
