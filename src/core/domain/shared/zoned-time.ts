import type { Weekday } from "../fulfilment/opening-hours";

export type LocalDate = `${number}-${number}-${number}`;

function parts(instant: Date, timeZone: string): Record<string, number> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, Number(p.value)]),
  );
}

function offsetMinutes(instant: Date, timeZone: string): number {
  const p = parts(instant, timeZone);
  const asUtc = Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!, p.second!);
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

export function localDate(instant: Date, timeZone: string): LocalDate {
  const p = parts(instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}` as LocalDate;
}

export function localMinutes(instant: Date, timeZone: string): number {
  const p = parts(instant, timeZone);
  return p.hour! * 60 + p.minute!;
}

function split(date: LocalDate): [number, number, number] {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return [year, month, day];
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const [year, month, day] = split(date);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10) as LocalDate;
}

export function weekdayOf(date: LocalDate): Weekday {
  const [year, month, day] = split(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as Weekday;
}

export function zonedInstant(date: LocalDate, minutes: number, timeZone: string): Date {
  const [year, month, day] = split(date);
  const guess = Date.UTC(year, month - 1, day, 0, minutes);
  const first = guess - offsetMinutes(new Date(guess), timeZone) * 60_000;
  return new Date(guess - offsetMinutes(new Date(first), timeZone) * 60_000);
}

export function formatMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
