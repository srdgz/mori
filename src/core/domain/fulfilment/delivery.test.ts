import { describe, expect, it } from "vitest";
import { money } from "../shared/money";
import { deliveryFee, freeDeliveryProgress, quoteDelivery, type DeliverySettings } from "./delivery";
import type { WeeklySchedule } from "./opening-hours";

const weekday = { opens: "08:00", closes: "20:00" } as const;
const schedule: WeeklySchedule = { 0: null, 1: weekday, 2: weekday, 3: weekday, 4: weekday, 5: weekday, 6: weekday };
const settings: DeliverySettings = {
  enabled: true,
  zones: ["28004", "28005"],
  minimum: money(1200),
  fee: money(250),
  freeFrom: money(2500),
  lastOrderMinutes: 30,
  etaMin: 30,
  etaMax: 45,
  timeZone: "Europe/Madrid",
};
const friday = new Date("2026-11-20T11:00:00Z");

function quote(overrides: Partial<Parameters<typeof quoteDelivery>[0]> = {}) {
  return quoteDelivery({ postalCode: "28004", subtotal: money(1500), now: friday, weekday: 5, schedule, settings, ...overrides });
}

describe("quoteDelivery", () => {
  it("charges the delivery fee below 25 €", () => {
    expect(quote()).toEqual({ ok: true, fee: money(250), etaMin: 30, etaMax: 45 });
  });

  it("delivers for free from exactly 25 €", () => {
    expect(quote({ subtotal: money(2500) })).toMatchObject({ ok: true, fee: money(0) });
  });

  it("rejects postcodes outside the zone or badly written", () => {
    expect(quote({ postalCode: "28020" })).toEqual({ ok: false, reason: "out_of_zone" });
    expect(quote({ postalCode: "2800" })).toEqual({ ok: false, reason: "out_of_zone" });
    expect(quote({ postalCode: " 28005 " })).toMatchObject({ ok: true });
  });

  it("says how much is missing for the 12 € minimum", () => {
    expect(quote({ subtotal: money(970) })).toEqual({ ok: false, reason: "below_minimum", missing: money(230) });
  });

  it("stops 30 minutes before closing, before opening and on closed days", () => {
    expect(quote({ now: new Date("2026-11-20T18:31:00Z") })).toEqual({ ok: false, reason: "closed" });
    expect(quote({ now: new Date("2026-11-20T18:30:00Z") })).toMatchObject({ ok: true });
    expect(quote({ now: new Date("2026-11-20T06:00:00Z") })).toEqual({ ok: false, reason: "closed" });
    expect(quote({ weekday: 0 })).toEqual({ ok: false, reason: "closed" });
  });

  it("can be switched off", () => {
    expect(quote({ settings: { ...settings, enabled: false } })).toEqual({ ok: false, reason: "disabled" });
  });
});

describe("free delivery helpers", () => {
  it("computes the fee and the progress towards free delivery", () => {
    expect(deliveryFee(money(2499), settings)).toEqual(money(250));
    expect(freeDeliveryProgress(money(1000), settings)).toEqual({ missing: money(1500), ratio: 0.4 });
    expect(freeDeliveryProgress(money(3000), settings)).toEqual({ missing: money(0), ratio: 1 });
  });
});
