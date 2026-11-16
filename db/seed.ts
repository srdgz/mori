import { seedDatabase } from "../src/infrastructure/db/seed";
import { connect } from "./connection";

async function main() {
  const { pool, db } = connect();
  try {
    await seedDatabase(db);
    console.log("Database seeded");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
