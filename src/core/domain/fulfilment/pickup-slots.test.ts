import { describe, expect, it } from "vitest";
import type { LocalDate } from "../shared/zoned-time";
import type { WeeklySchedule } from "./opening-hours";
import { findSlot, firstAvailable, pickupDays, type SlotSettings } from "./pickup-slots";

const weekday = { opens: "08:00", closes: "20:00" } as const;
const schedule: WeeklySchedule = {
  0: null,
  1: weekday,
  2: weekday,
  3: weekday,
  4: weekday,
  5: weekday,
  6: { opens: "09:30", closes: "20:30" },
};
const settings: SlotSettings = { timeZone: "Europe/Madrid", slotMinutes: 15, prepMinutes: 15, capacity: 8, daysAhead: 1 };

function at(iso: string): Date {
  return new Date(iso);
}

describe("pickupDays", () => {
  it("starts today after the preparation time, on a 15-minute boundary", () => {
    const days = pickupDays({ now: at("2026-11-20T09:07:00Z"), schedule, closures: [], settings, load: new Map() });
    expect(days[0]?.date).toBe("2026-11-20");
    expect(days[0]?.slots[0]?.label).toBe("10:30");
    expect(days[0]?.slots.at(-1)?.label).toBe("19:45");
  });

  it("starts at opening time when the shop hasn't opened yet", () => {
    const days = pickupDays({ now: at("2026-11-20T05:00:00Z"), schedule, closures: [], settings, load: new Map() });
    expect(days[0]?.slots[0]?.label).toBe("08:00");
  });

  it("offers tomorrow from its own opening time", () => {
    const days = pickupDays({ now: at("2026-11-20T09:07:00Z"), schedule, closures: [], settings, load: new Map() });
    expect(days[1]).toMatchObject({ date: "2026-11-21" });
    expect(days[1]?.slots[0]?.label).toBe("09:30");
    expect(days[1]?.slots.at(-1)?.label).toBe("20:15");
  });

  it("skips today once it's too late, and closed days and closures", () => {
    const saturdayNight = pickupDays({ now: at("2026-11-21T19:20:00Z"), schedule, closures: [], settings, load: new Map() });
    expect(saturdayNight).toEqual([]);
    const withClosure = pickupDays({
      now: at("2026-11-19T09:00:00Z"),
      schedule,
      closures: ["2026-11-20" as LocalDate],
      settings,
      load: new Map(),
    });
    expect(withClosure.map((d) => d.date)).toEqual(["2026-11-19"]);
  });

  it("marks full slots and counts what's left", () => {
    const tenThirty = at("2026-11-20T09:30:00Z");
    const tenFortyFive = at("2026-11-20T09:45:00Z");
    const days = pickupDays({
      now: at("2026-11-20T09:07:00Z"),
      schedule,
      closures: [],
      settings,
      load: new Map([
        [tenThirty.getTime(), 8],
        [tenFortyFive.getTime(), 5],
      ]),
    });
    expect(findSlot(days, tenThirty)).toMatchObject({ status: "full", remaining: 0 });
    expect(findSlot(days, tenFortyFive)).toMatchObject({ status: "available", remaining: 3 });
    expect(firstAvailable(days)?.label).toBe("10:45");
  });

  it("returns nothing for an unknown slot or when everything is full", () => {
    const days = pickupDays({
      now: at("2026-11-20T09:07:00Z"),
      schedule,
      closures: [],
      settings: { ...settings, capacity: 0 },
      load: new Map(),
    });
    expect(findSlot(days, at("2026-11-20T09:31:00Z"))).toBeNull();
    expect(firstAvailable(days)).toBeNull();
  });
});
