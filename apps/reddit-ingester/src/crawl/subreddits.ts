import { asc, eq } from "drizzle-orm";
import { db, subreddits } from "@rsentiment/db";

export type EnabledSubreddit = {
  id: number;
  name: string;
  lastCrawledAt: Date | null;
};

export async function getEnabledSubreddits(): Promise<EnabledSubreddit[]> {
  return db
    .select({
      id: subreddits.id,
      name: subreddits.name,
      lastCrawledAt: subreddits.lastCrawledAt
    })
    .from(subreddits)
    .where(eq(subreddits.enabled, true))
    .orderBy(asc(subreddits.name));
}

export async function updateLastCrawledAt(subredditId: number, crawledAt: Date): Promise<void> {
  await db
    .update(subreddits)
    .set({
      lastCrawledAt: crawledAt,
      updatedAt: new Date()
    })
    .where(eq(subreddits.id, subredditId));
}
