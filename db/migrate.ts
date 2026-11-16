import { migrate } from "drizzle-orm/node-postgres/migrator";
import { connect } from "./connection";

async function main() {
  const { pool, db } = connect();
  try {
    await migrate(db, { migrationsFolder: "db/migrations" });
    console.log("Database migrations applied");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
