import type { RawItem } from "@rsentiment/contracts";
import { getIngesterEnv, type IngesterEnv } from "@rsentiment/config";
import { logger } from "@rsentiment/observability";
import { crawlCommentsSince } from "./crawl/comments.js";
import { crawlPostsSince } from "./crawl/posts.js";
import { getEnabledSubreddits, type EnabledSubreddit, updateLastCrawledAt } from "./crawl/subreddits.js";
import { MockRedditClient } from "./mock-reddit-client.js";
import { normalizeRawComment, normalizeRawPost } from "./normalize/raw-items.js";
import { createRawItemPublisher } from "./publish/raw-items.js";
import { RedditClient, type RedditApiClient, type RedditCredentials } from "./reddit-client.js";

const POLL_INTERVAL_MS = 60_000;
const WATERMARK_OVERLAP_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getLowerBound(lastCrawledAt: Date | null, backfillDays: number, now: Date): Date {
  if (!lastCrawledAt) {
    return new Date(now.getTime() - backfillDays * 24 * 60 * 60 * 1000);
  }

  const overlapped = lastCrawledAt.getTime() - WATERMARK_OVERLAP_MS;
  return new Date(Math.max(overlapped, 0));
}

function getRedditCredentials(env: IngesterEnv): RedditCredentials {
  if (!env.REDDIT_CLIENT_ID || !env.REDDIT_CLIENT_SECRET || !env.REDDIT_USER_AGENT) {
    throw new Error("Missing Reddit credentials for reddit ingestion source");
  }

  return {
    clientId: env.REDDIT_CLIENT_ID,
    clientSecret: env.REDDIT_CLIENT_SECRET,
    userAgent: env.REDDIT_USER_AGENT
  };
}

function createIngestionClient(env: IngesterEnv): RedditApiClient {
  if (env.INGESTER_SOURCE === "mock") {
    return new MockRedditClient();
  }

  return new RedditClient(getRedditCredentials(env));
}

async function crawlAndPublishSubreddit(
  subreddit: EnabledSubreddit,
  cycleStartedAt: Date,
  client: RedditApiClient,
  publishRawItems: (items: RawItem[]) => Promise<number>,
  backfillDays: number,
  log: typeof logger
): Promise<void> {
  const lowerBound = getLowerBound(subreddit.lastCrawledAt, backfillDays, cycleStartedAt);

  const [postResult, commentResult] = await Promise.all([
    crawlPostsSince(client, subreddit.name, lowerBound),
    crawlCommentsSince(client, subreddit.name, lowerBound)
  ]);

  const ingestedAt = new Date();
  const dedupe = new Set<string>();
  const rawItems: RawItem[] = [];

  for (const post of postResult.items) {
    const normalized = normalizeRawPost(post, ingestedAt);
    const key = `${normalized.itemKind}:${normalized.redditId}`;

    if (dedupe.has(key)) {
      continue;
    }

    dedupe.add(key);
    rawItems.push(normalized);
  }

  for (const comment of commentResult.items) {
    const normalized = normalizeRawComment(comment, ingestedAt);
    const key = `${normalized.itemKind}:${normalized.redditId}`;

    if (dedupe.has(key)) {
      continue;
    }

    dedupe.add(key);
    rawItems.push(normalized);
  }

  const published = await publishRawItems(rawItems);
  const newestSeenMs = Math.max(
    postResult.newestSeenAt?.getTime() ?? 0,
    commentResult.newestSeenAt?.getTime() ?? 0,
    cycleStartedAt.getTime()
  );
  const nextCrawledAt = new Date(newestSeenMs);
  await updateLastCrawledAt(subreddit.id, nextCrawledAt);

  log.info(
    {
      subreddit: subreddit.name,
      lowerBound: lowerBound.toISOString(),
      postsFetched: postResult.items.length,
      commentsFetched: commentResult.items.length,
      postPagesFetched: postResult.pagesFetched,
      commentPagesFetched: commentResult.pagesFetched,
      reachedPostLowerBound: postResult.reachedLowerBound,
      reachedCommentLowerBound: commentResult.reachedLowerBound,
      published,
      updatedLastCrawledAt: nextCrawledAt.toISOString()
    },
    "Completed subreddit crawl cycle"
  );
}

async function main(): Promise<void> {
  const env = getIngesterEnv();
  const log = logger.child({ service: "reddit-ingester" });
  const redditClient = createIngestionClient(env);
  const publisher = createRawItemPublisher(env.GCP_PROJECT_ID, env.PUBSUB_RAW_POSTS_TOPIC);

  let shouldStop = false;
  const stop = (): void => {
    shouldStop = true;
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  log.info(
    {
      status: "bootstrapped",
      region: env.GCP_REGION,
      rawPostsTopic: env.PUBSUB_RAW_POSTS_TOPIC,
      backfillDays: env.INGESTER_BACKFILL_DAYS,
      source: env.INGESTER_SOURCE,
      pollIntervalMs: POLL_INTERVAL_MS
    },
    "Reddit ingester started"
  );

  while (!shouldStop) {
    const cycleStartedAt = new Date();

    try {
      const enabledSubreddits = await getEnabledSubreddits();

      if (enabledSubreddits.length === 0) {
        log.warn("No enabled subreddits found");
      }

      for (const subreddit of enabledSubreddits) {
        if (shouldStop) {
          break;
        }

        try {
          await crawlAndPublishSubreddit(
            subreddit,
            cycleStartedAt,
            redditClient,
            publisher.publish,
            env.INGESTER_BACKFILL_DAYS,
            log
          );
        } catch (error) {
          log.error(
            {
              subreddit: subreddit.name,
              err: error
            },
            "Subreddit crawl failed"
          );
        }
      }
    } catch (error) {
      log.error({ err: error }, "Crawl loop failed");
    }

    if (shouldStop) {
      break;
    }

    const cycleDurationMs = Date.now() - cycleStartedAt.getTime();
    const waitMs = Math.max(POLL_INTERVAL_MS - cycleDurationMs, 0);
    await sleep(waitMs);
  }

  log.info("Reddit ingester shutting down");
}

main().catch((error) => {
  logger.error({ err: error }, "Reddit ingester failed to start");
  process.exit(1);
});
