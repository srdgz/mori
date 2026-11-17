import { addDays, formatMinutes, localDate, localMinutes, weekdayOf, zonedInstant, type LocalDate } from "../shared/zoned-time";
import { toMinutes, type WeeklySchedule } from "./opening-hours";

export type SlotSettings = Readonly<{
  timeZone: string;
  slotMinutes: number;
  prepMinutes: number;
  capacity: number;
  daysAhead: number;
}>;

export type SlotStatus = "available" | "full";

export type PickupSlot = Readonly<{ start: Date; label: string; status: SlotStatus; remaining: number }>;

export type PickupDay = Readonly<{ date: LocalDate; slots: readonly PickupSlot[] }>;

type Input = Readonly<{
  now: Date;
  schedule: WeeklySchedule;
  closures: readonly LocalDate[];
  settings: SlotSettings;
  load: ReadonlyMap<number, number>;
}>;

function firstSlotFrom(minutes: number, step: number): number {
  return Math.ceil(minutes / step) * step;
}

export function pickupDays({ now, schedule, closures, settings, load }: Input): PickupDay[] {
  const today = localDate(now, settings.timeZone);
  const earliestToday = localMinutes(now, settings.timeZone) + settings.prepMinutes;
  const days: PickupDay[] = [];

  for (let offset = 0; offset <= settings.daysAhead; offset++) {
    const date = addDays(today, offset);
    const hours = schedule[weekdayOf(date)];
    if (!hours || closures.includes(date)) continue;

    const opens = toMinutes(hours.opens);
    const lastStart = toMinutes(hours.closes) - settings.slotMinutes;
    const from = offset === 0 ? Math.max(opens, firstSlotFrom(earliestToday, settings.slotMinutes)) : opens;

    const slots: PickupSlot[] = [];
    for (let minutes = from; minutes <= lastStart; minutes += settings.slotMinutes) {
      const start = zonedInstant(date, minutes, settings.timeZone);
      const remaining = Math.max(0, settings.capacity - (load.get(start.getTime()) ?? 0));
      slots.push({ start, label: formatMinutes(minutes), status: remaining > 0 ? "available" : "full", remaining });
    }
    if (slots.length > 0) days.push({ date, slots });
  }

  return days;
}

export function findSlot(days: readonly PickupDay[], start: Date): PickupSlot | null {
  for (const day of days) {
    const slot = day.slots.find((s) => s.start.getTime() === start.getTime());
    if (slot) return slot;
  }
  return null;
}

export function firstAvailable(days: readonly PickupDay[]): PickupSlot | null {
  for (const day of days) {
    const slot = day.slots.find((s) => s.status === "available");
    if (slot) return slot;
  }
  return null;
}
