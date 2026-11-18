import { describe, expect, it } from "vitest";
import { addDays, formatMinutes, isLocalDate, localDate, localMinutes, weekdayOf, zonedInstant } from "./zoned-time";

const MADRID = "Europe/Madrid";

describe("zoned time", () => {
  it("reads the local date and minutes in Madrid", () => {
    const lateNightUtc = new Date("2026-11-20T23:30:00Z");
    expect(localDate(lateNightUtc, MADRID)).toBe("2026-11-21");
    expect(localMinutes(lateNightUtc, MADRID)).toBe(30);
  });

  it("turns a Madrid wall time into the right instant in winter and summer", () => {
    expect(zonedInstant("2026-11-20", 10 * 60 + 15, MADRID).toISOString()).toBe("2026-11-20T09:15:00.000Z");
    expect(zonedInstant("2026-07-20", 10 * 60 + 15, MADRID).toISOString()).toBe("2026-07-20T08:15:00.000Z");
  });

  it("handles the day the clocks change", () => {
    expect(zonedInstant("2026-03-29", 12 * 60, MADRID).toISOString()).toBe("2026-03-29T10:00:00.000Z");
    expect(zonedInstant("2026-10-25", 12 * 60, MADRID).toISOString()).toBe("2026-10-25T11:00:00.000Z");
  });

  it("adds days across months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("knows the weekday of a date", () => {
    expect(weekdayOf("2026-11-22")).toBe(0);
    expect(weekdayOf("2026-11-20")).toBe(5);
  });

  it("formats minutes as a clock time", () => {
    expect(formatMinutes(9 * 60 + 5)).toBe("09:05");
    expect(formatMinutes(20 * 60)).toBe("20:00");
  });
});

describe("isLocalDate", () => {
  it("accepts real calendar days only", () => {
    expect(isLocalDate("2030-01-07")).toBe(true);
    expect(isLocalDate("2030-02-30")).toBe(false);
    expect(isLocalDate("2030-1-7")).toBe(false);
    expect(isLocalDate("today")).toBe(false);
  });
});
