import { DomainError } from "../shared/domain-error";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type TimeOfDay = `${number}${number}:${number}${number}`;

export type DayHours = Readonly<{ opens: TimeOfDay; closes: TimeOfDay }> | null;

export type WeeklySchedule = Readonly<Record<Weekday, DayHours>>;

export type LocalMoment = Readonly<{ weekday: Weekday; minutes: number }>;

export type OpenStatus =
  | Readonly<{ state: "open"; closesAt: TimeOfDay }>
  | Readonly<{ state: "opens-later-today"; opensAt: TimeOfDay }>
  | Readonly<{ state: "closed-until-another-day" }>;

export function toMinutes(time: TimeOfDay): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) throw new DomainError("time.invalid", `Invalid time ${time}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new DomainError("time.invalid", `Invalid time ${time}`);
  return hours * 60 + minutes;
}

export function localMoment(instant: Date, timeZone: string): LocalMoment {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  const weekday = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))).getUTCDay() as Weekday;
  return { weekday, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export function openStatus(schedule: WeeklySchedule, moment: LocalMoment): OpenStatus {
  const today = schedule[moment.weekday];
  if (!today) return { state: "closed-until-another-day" };
  const opens = toMinutes(today.opens);
  const closes = toMinutes(today.closes);
  if (moment.minutes >= opens && moment.minutes < closes) return { state: "open", closesAt: today.closes };
  if (moment.minutes < opens) return { state: "opens-later-today", opensAt: today.opens };
  return { state: "closed-until-another-day" };
}

export function isWeekend(weekday: Weekday): boolean {
  return weekday === 0 || weekday === 6;
}

export const MONDAY_FIRST: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];
