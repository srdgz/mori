import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema";
import { seedDatabase } from "./seed";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("create_order on a real Postgres server", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url, max: 10 });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: "db/migrations" });
    await seedDatabase(db);
    await db.execute(sql`delete from orders`);
    await db.execute(sql`update store_settings set slot_capacity = 1`);
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("lets only one of ten simultaneous orders take the last place in a slot", async () => {
    const db = drizzle(pool, { schema });
    const attempts = Array.from({ length: 10 }, (_, i) => {
      const order = {
        code: `MR-RACE${i}`,
        contact_name: "Ana",
        contact_email: "ana@example.com",
        contact_phone: "600000000",
        locale: "es",
        fulfilment: "pickup",
        slot_start: "2026-11-20T10:00:00Z",
        subtotal_cents: 450,
        total_cents: 450,
        vat_cents: 41,
      };
      return db.execute(sql`select create_order(${JSON.stringify(order)}::jsonb, '[]'::jsonb)`);
    });

    const results = await Promise.allSettled(attempts);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const reasons = results.flatMap((r) => (r.status === "rejected" ? [String((r.reason as { cause?: unknown }).cause ?? r.reason)] : []));
    expect(reasons.every((reason) => reason.includes("slot_full"))).toBe(true);
  });
});
