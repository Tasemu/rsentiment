import { eq, sql } from "drizzle-orm";
import { db, dbPool, subreddits } from "../src/index.js";

const seedSubreddits = ["wallstreetbets", "stocks", "options", "investing"];

async function run(): Promise<void> {
  for (const subredditName of seedSubreddits) {
    await db
      .insert(subreddits)
      .values({
        name: subredditName,
        enabled: true
      })
      .onConflictDoUpdate({
        target: subreddits.name,
        set: {
          enabled: true,
          updatedAt: sql`now()`
        }
      });
  }

  const rows = await db
    .select({ name: subreddits.name, enabled: subreddits.enabled })
    .from(subreddits)
    .where(eq(subreddits.enabled, true));

  console.log("Seeded subreddits:", rows.map((row) => row.name).join(", "));
}

run()
  .catch((error) => {
    console.error("Failed to seed subreddits", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbPool.end();
  });
