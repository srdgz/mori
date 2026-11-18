import { describe, expect, it } from "vitest";
import { isPostalCode, settingsErrors, type EditableSettings } from "./store-settings";

const hours = { opens: "08:00", closes: "20:00" } as const;
const valid: EditableSettings = {
  ordersPaused: false,
  prepMinutes: 15,
  slotCapacity: 8,
  daysAhead: 1,
  schedule: { 0: null, 1: hours, 2: hours, 3: hours, 4: hours, 5: hours, 6: hours },
  delivery: { enabled: true, minimumCents: 1200, feeCents: 250, freeFromCents: 2500, lastOrderMinutes: 30, etaMin: 30, etaMax: 45 },
};

describe("settingsErrors", () => {
  it("accepts sensible settings", () => {
    expect(settingsErrors(valid)).toEqual([]);
  });

  it("flags values out of range and impossible hours", () => {
    expect(
      settingsErrors({
        ...valid,
        prepMinutes: 200,
        slotCapacity: 0,
        daysAhead: 30,
        schedule: { ...valid.schedule, 1: { opens: "20:00", closes: "08:00" } },
        delivery: { ...valid.delivery, etaMin: 50, etaMax: 40 },
      }),
    ).toEqual(["prepMinutes", "slotCapacity", "daysAhead", "schedule", "delivery"]);
    expect(settingsErrors({ ...valid, delivery: { ...valid.delivery, feeCents: 2.5 } })).toEqual(["delivery"]);
  });
});

describe("isPostalCode", () => {
  it("accepts five digits only", () => {
    expect(isPostalCode("28004")).toBe(true);
    expect(isPostalCode("2800")).toBe(false);
    expect(isPostalCode("28004A")).toBe(false);
  });
});
