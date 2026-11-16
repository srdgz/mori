import { sql } from "drizzle-orm";
import type { RateLimiter, RateRule } from "@/core/application/ports/rate-limiter";
import type { Clock } from "@/core/application/ports/clock";
import type { Database } from "./database";

export class DrizzleRateLimiter implements RateLimiter {
  constructor(
    private readonly db: Database,
    private readonly clock: Clock,
  ) {}

  async hit(key: string, rule: RateRule): Promise<boolean> {
    const now = this.clock.now().getTime();
    const windowStart = now - rule.windowSeconds * 1000;
    const result = (await this.db.execute(sql`
      insert into rate_limits (key, count, last_request) values (${`mori:${key}`}, 1, ${now})
      on conflict (key) do update set
        count = case when rate_limits.last_request < ${windowStart} then 1 else rate_limits.count + 1 end,
        last_request = case when rate_limits.last_request < ${windowStart} then ${now} else rate_limits.last_request end
      returning count
    `)) as unknown as { rows: { count: number }[] };
    return (result.rows[0]?.count ?? 0) <= rule.max;
  }
}
