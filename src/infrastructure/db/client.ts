import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Database } from "./database";
import * as schema from "./schema";

let database: Database | undefined;

export function getDatabase(): Database {
  if (database) return database;
  const connectionString = process.env.DATABASE_APP_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. Add the Neon connection string to .env.local.");
  const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 5_000 });
  attachDatabasePool(pool);
  database = drizzle(pool, { schema });
  return database;
}
