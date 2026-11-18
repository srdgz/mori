import { toMinutes, type WeeklySchedule } from "./opening-hours";

export type EditableSettings = Readonly<{
  ordersPaused: boolean;
  prepMinutes: number;
  slotCapacity: number;
  daysAhead: number;
  schedule: WeeklySchedule;
  delivery: Readonly<{
    enabled: boolean;
    minimumCents: number;
    feeCents: number;
    freeFromCents: number;
    lastOrderMinutes: number;
    etaMin: number;
    etaMax: number;
  }>;
}>;

export type SettingsField = "prepMinutes" | "slotCapacity" | "daysAhead" | "schedule" | "delivery";

const within = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;

export function settingsErrors(settings: EditableSettings): SettingsField[] {
  const errors: SettingsField[] = [];
  if (!within(settings.prepMinutes, 0, 120)) errors.push("prepMinutes");
  if (!within(settings.slotCapacity, 1, 50)) errors.push("slotCapacity");
  if (!within(settings.daysAhead, 0, 14)) errors.push("daysAhead");
  const days = Object.values(settings.schedule);
  if (days.some((day) => day !== null && toMinutes(day.opens) >= toMinutes(day.closes))) errors.push("schedule");
  const d = settings.delivery;
  if (
    !within(d.minimumCents, 0, 10_000) ||
    !within(d.feeCents, 0, 2_000) ||
    !within(d.freeFromCents, 0, 20_000) ||
    !within(d.lastOrderMinutes, 0, 180) ||
    !within(d.etaMin, 5, 180) ||
    !within(d.etaMax, 5, 240) ||
    d.etaMax < d.etaMin
  )
    errors.push("delivery");
  return errors;
}

export function isPostalCode(value: string): boolean {
  return /^\d{5}$/.test(value);
}
