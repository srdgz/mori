import { money, subtract, ZERO, type Money } from "../shared/money";
import { localMinutes } from "../shared/zoned-time";
import { toMinutes, type WeeklySchedule, type Weekday } from "./opening-hours";

export type DeliverySettings = Readonly<{
  enabled: boolean;
  zones: readonly string[];
  minimum: Money;
  fee: Money;
  freeFrom: Money;
  lastOrderMinutes: number;
  etaMin: number;
  etaMax: number;
  timeZone: string;
}>;

export type DeliveryQuote =
  | Readonly<{ ok: true; fee: Money; etaMin: number; etaMax: number }>
  | Readonly<{ ok: false; reason: "disabled" | "out_of_zone" | "closed" }>
  | Readonly<{ ok: false; reason: "below_minimum"; missing: Money }>;

const POSTAL_CODE = /^[0-9]{5}$/;

export function deliveryFee(subtotal: Money, settings: Pick<DeliverySettings, "fee" | "freeFrom">): Money {
  return subtotal.cents >= settings.freeFrom.cents ? ZERO : settings.fee;
}

export function freeDeliveryProgress(subtotal: Money, settings: Pick<DeliverySettings, "freeFrom">): { missing: Money; ratio: number } {
  return {
    missing: subtract(settings.freeFrom, subtotal),
    ratio: Math.min(1, subtotal.cents / settings.freeFrom.cents),
  };
}

type Input = Readonly<{
  postalCode: string;
  subtotal: Money;
  now: Date;
  weekday: Weekday;
  schedule: WeeklySchedule;
  settings: DeliverySettings;
}>;

export function quoteDelivery({ postalCode, subtotal, now, weekday, schedule, settings }: Input): DeliveryQuote {
  if (!settings.enabled) return { ok: false, reason: "disabled" };
  const code = postalCode.trim();
  if (!POSTAL_CODE.test(code) || !settings.zones.includes(code)) return { ok: false, reason: "out_of_zone" };

  const hours = schedule[weekday];
  const minutes = localMinutes(now, settings.timeZone);
  if (!hours || minutes < toMinutes(hours.opens) || minutes > toMinutes(hours.closes) - settings.lastOrderMinutes) {
    return { ok: false, reason: "closed" };
  }

  if (subtotal.cents < settings.minimum.cents)
    return { ok: false, reason: "below_minimum", missing: money(settings.minimum.cents - subtotal.cents) };
  return { ok: true, fee: deliveryFee(subtotal, settings), etaMin: settings.etaMin, etaMax: settings.etaMax };
}
