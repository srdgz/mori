import type { Clock } from "@/core/application/ports/clock";
import type { RateLimiter, RateRule } from "@/core/application/ports/rate-limiter";

export class MemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, { count: number; start: number }>();

  constructor(private readonly clock: Clock) {}

  async hit(key: string, rule: RateRule): Promise<boolean> {
    const now = this.clock.now().getTime();
    const current = this.hits.get(key);
    const entry =
      !current || current.start < now - rule.windowSeconds * 1000 ? { count: 1, start: now } : { ...current, count: current.count + 1 };
    this.hits.set(key, entry);
    return entry.count <= rule.max;
  }
}
