import type { Clock } from "@/core/application/ports/clock";

export const systemClock: Clock = { now: () => new Date() };

export class FixedClock implements Clock {
  constructor(private readonly instant: Date) {}

  now(): Date {
    return new Date(this.instant);
  }
}
