import type { RedditApiClient, RedditPost } from "../reddit-client.js";

export type CrawlItemsResult<TItem> = {
  items: TItem[];
  pagesFetched: number;
  reachedLowerBound: boolean;
  newestSeenAt: Date | null;
  oldestSeenAt: Date | null;
};

const DEFAULT_MAX_PAGES = 25;

export async function crawlPostsSince(
  client: RedditApiClient,
  subreddit: string,
  lowerBound: Date,
  maxPages = DEFAULT_MAX_PAGES
): Promise<CrawlItemsResult<RedditPost>> {
  const items: RedditPost[] = [];
  let after: string | null = null;
  let pagesFetched = 0;
  let reachedLowerBound = false;
  let newestSeenAt: Date | null = null;
  let oldestSeenAt: Date | null = null;

  while (pagesFetched < maxPages) {
    const page = await client.fetchNewPostsPage(subreddit, after);
    pagesFetched += 1;

    if (page.items.length === 0) {
      break;
    }

    for (const post of page.items) {
      const createdAt = new Date(post.createdUtc * 1000);

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

      items.push(post);
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
