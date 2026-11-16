import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Database } from "./database";
import * as schema from "./schema";
import { seedDatabase } from "./seed";

export type TestDatabase = { db: Database; client: PGlite };

export async function createTestDatabase({ seed = true } = {}): Promise<TestDatabase> {
  const client = new PGlite({ extensions: { citext } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "db/migrations" });
  if (seed) await seedDatabase(db);
  return { db, client };
}
