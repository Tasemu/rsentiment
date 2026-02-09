import type { RedditApiClient, RedditComment } from "../reddit-client.js";
import type { CrawlItemsResult } from "./posts.js";

const DEFAULT_MAX_PAGES = 25;

export async function crawlCommentsSince(
  client: RedditApiClient,
  subreddit: string,
  lowerBound: Date,
  maxPages = DEFAULT_MAX_PAGES
): Promise<CrawlItemsResult<RedditComment>> {
  const items: RedditComment[] = [];
  let after: string | null = null;
  let pagesFetched = 0;
  let reachedLowerBound = false;
  let newestSeenAt: Date | null = null;
  let oldestSeenAt: Date | null = null;

  while (pagesFetched < maxPages) {
    const page = await client.fetchNewCommentsPage(subreddit, after);
    pagesFetched += 1;

    if (page.items.length === 0) {
      break;
    }

    for (const comment of page.items) {
      const createdAt = new Date(comment.createdUtc * 1000);

      if (!newestSeenAt || createdAt > newestSeenAt) {
        newestSeenAt = createdAt;
      }

      if (!oldestSeenAt || createdAt < oldestSeenAt) {
        oldestSeenAt = createdAt;
      }

      if (createdAt < lowerBound) {
        reachedLowerBound = true;
        break;
      }

      items.push(comment);
    }

    if (reachedLowerBound || !page.nextAfter) {
      break;
    }

    after = page.nextAfter;
  }

  return {
    items,
    pagesFetched,
    reachedLowerBound,
    newestSeenAt,
    oldestSeenAt
  };
}
