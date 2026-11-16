import { describe, expect, it } from "vitest";
import { isWeekend, localMoment, openStatus, toMinutes, type WeeklySchedule } from "./opening-hours";

const weekday = { opens: "08:00", closes: "20:00" } as const;
const weekend = { opens: "09:30", closes: "20:30" } as const;
const schedule: WeeklySchedule = { 0: weekend, 1: weekday, 2: weekday, 3: null, 4: weekday, 5: weekday, 6: weekend };

describe("toMinutes", () => {
  it("converts HH:MM to minutes since midnight", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("09:30")).toBe(570);
    expect(toMinutes("23:59")).toBe(1439);
  });

  it("rejects impossible times", () => {
    expect(() => toMinutes("24:00")).toThrowError(expect.objectContaining({ code: "time.invalid" }));
    expect(() => toMinutes("12:60")).toThrowError(expect.objectContaining({ code: "time.invalid" }));
    expect(() => toMinutes("9:30" as never)).toThrowError(expect.objectContaining({ code: "time.invalid" }));
  });
});

describe("localMoment", () => {
  it("reads weekday and time in Madrid during winter time (UTC+1)", () => {
    expect(localMoment(new Date("2026-11-16T07:59:00Z"), "Europe/Madrid")).toEqual({ weekday: 1, minutes: 8 * 60 + 59 });
  });

  it("reads weekday and time in Madrid during summer time (UTC+2)", () => {
    expect(localMoment(new Date("2026-07-05T22:30:00Z"), "Europe/Madrid")).toEqual({ weekday: 1, minutes: 30 });
  });

  it("handles midnight as minute zero", () => {
    expect(localMoment(new Date("2026-11-15T23:00:00Z"), "Europe/Madrid")).toEqual({ weekday: 1, minutes: 0 });
  });
});

describe("openStatus", () => {
  it("is open from the opening minute until the minute before closing", () => {
    expect(openStatus(schedule, { weekday: 1, minutes: 480 })).toEqual({ state: "open", closesAt: "20:00" });
    expect(openStatus(schedule, { weekday: 1, minutes: 1199 })).toEqual({ state: "open", closesAt: "20:00" });
  });

  it("is closed exactly at closing time", () => {
    expect(openStatus(schedule, { weekday: 1, minutes: 1200 })).toEqual({ state: "closed-until-another-day" });
  });

  it("announces the opening time before opening", () => {
    expect(openStatus(schedule, { weekday: 6, minutes: 540 })).toEqual({ state: "opens-later-today", opensAt: "09:30" });
  });

  it("is closed all day on a day without hours", () => {
    expect(openStatus(schedule, { weekday: 3, minutes: 600 })).toEqual({ state: "closed-until-another-day" });
  });
});

describe("isWeekend", () => {
  it("treats Saturday and Sunday as weekend", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((d) => isWeekend(d as 0))).toEqual([true, false, false, false, false, false, true]);
  });
});
