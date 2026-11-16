import { describe, expect, it } from "vitest";
import type { RateLimiter } from "@/core/application/ports/rate-limiter";

export type MovableClock = { now(): Date; advance(seconds: number): void };

export function movableClock(start = new Date("2026-11-20T10:00:00Z")): MovableClock {
  let current = start.getTime();
  return { now: () => new Date(current), advance: (seconds) => (current += seconds * 1000) };
}

export function rateLimiterContract(name: string, setup: (clock: MovableClock) => Promise<RateLimiter> | RateLimiter) {
  describe(`${name} (RateLimiter contract)`, () => {
    const rule = { max: 2, windowSeconds: 60 };

    it("allows hits up to the limit inside the window", async () => {
      const limiter = await setup(movableClock());
      expect([await limiter.hit("a", rule), await limiter.hit("a", rule), await limiter.hit("a", rule)]).toEqual([true, true, false]);
    });

    it("counts keys separately", async () => {
      const limiter = await setup(movableClock());
      await limiter.hit("b", rule);
      await limiter.hit("b", rule);
      expect(await limiter.hit("c", rule)).toBe(true);
    });

    it("starts a new window once the old one has passed", async () => {
      const clock = movableClock();
      const limiter = await setup(clock);
      await limiter.hit("d", rule);
      await limiter.hit("d", rule);
      await limiter.hit("d", rule);
      clock.advance(61);
      expect(await limiter.hit("d", rule)).toBe(true);
    });
  });
}
