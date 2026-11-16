import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/infrastructure/db/schema";

export function connect() {
  loadEnvConfig(process.cwd());
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Add the Neon connection string to .env.local.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString, max: 1 });
  return { pool, db: drizzle(pool, { schema }) };
}
