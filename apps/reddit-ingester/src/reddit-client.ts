import Bottleneck from "bottleneck";
import { fetch } from "undici";
import { z } from "zod";
import type { IngesterEnv } from "@rsentiment/config";
import { logger } from "@rsentiment/observability";

const oauthResponseSchema = z
  .object({
    access_token: z.string().min(1),
    token_type: z.string().min(1),
    expires_in: z.number().int().positive()
  })
  .passthrough();

const listingResponseSchema = z
  .object({
    data: z.object({
      after: z.string().nullable(),
      children: z.array(
        z.object({
          kind: z.string(),
          data: z.unknown()
        })
      )
    })
  })
  .passthrough();

const redditPostDataSchema = z
  .object({
    id: z.string().min(1),
    subreddit: z.string().min(1),
    author: z.string().optional(),
    created_utc: z.number(),
    score: z.number().int(),
    permalink: z.string().min(1),
    title: z.string().min(1),
    selftext: z.string().optional(),
    num_comments: z.number().int().nonnegative()
  })
  .passthrough();

const redditCommentDataSchema = z
  .object({
    id: z.string().min(1),
    subreddit: z.string().min(1),
    author: z.string().optional(),
    created_utc: z.number(),
    score: z.number().int(),
    permalink: z.string().min(1),
    body: z.string().optional(),
    parent_id: z.string().min(1),
    link_id: z.string().min(1)
  })
  .passthrough();

const REDDIT_API_BASE = "https://oauth.reddit.com";
const REDDIT_OAUTH_BASE = "https://www.reddit.com";
const REQUEST_LIMIT = 100;
const MAX_REQUEST_ATTEMPTS = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type RedditRequestConfig = {
  clientId: string;
  clientSecret: string;
  userAgent: string;
};

export type RedditPost = {
  redditId: string;
  subreddit: string;
  author: string;
  createdUtc: number;
  score: number;
  permalink: string;
  title: string;
  body: string;
  commentCount: number;
};

export type RedditComment = {
  redditId: string;
  subreddit: string;
  author: string;
  createdUtc: number;
  score: number;
  permalink: string;
  body: string;
  parentRedditId: string;
  postRedditId: string;
};

export type RedditPage<T> = {
  items: T[];
  nextAfter: string | null;
};

type RateLimitState = {
  remaining: number;
  resetAtMs: number;
};

function stripRedditPrefix(fullname: string): string {
  const separatorIndex = fullname.indexOf("_");

  if (separatorIndex === -1) {
    return fullname;
  }

  return fullname.slice(separatorIndex + 1);
}

function parseRetryAfterMs(retryAfterHeader: string | null): number {
  if (!retryAfterHeader) {
    return 0;
  }

  const parsed = Number.parseFloat(retryAfterHeader);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.ceil(parsed * 1000);
}

export class RedditClient {
  private readonly log = logger.child({ service: "reddit-ingester", component: "reddit-client" });

  private readonly limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 300
  });

  private readonly requestConfig: RedditRequestConfig;

  private accessToken: string | null = null;

  private tokenExpiresAtMs = 0;

  private rateLimitState: RateLimitState | null = null;

  public constructor(env: Pick<IngesterEnv, "REDDIT_CLIENT_ID" | "REDDIT_CLIENT_SECRET" | "REDDIT_USER_AGENT">) {
    this.requestConfig = {
      clientId: env.REDDIT_CLIENT_ID,
      clientSecret: env.REDDIT_CLIENT_SECRET,
      userAgent: env.REDDIT_USER_AGENT
    };
  }

  public async fetchNewPostsPage(subreddit: string, after: string | null): Promise<RedditPage<RedditPost>> {
    const listing = await this.fetchListing(`/r/${subreddit}/new`, after);
    const items: RedditPost[] = [];

    for (const child of listing.children) {
      if (child.kind !== "t3") {
        continue;
      }

      const parsed = redditPostDataSchema.safeParse(child.data);
      if (!parsed.success) {
        this.log.warn(
          {
            subreddit,
            issueCount: parsed.error.issues.length
          },
          "Skipped invalid Reddit post payload"
        );
        continue;
      }

      items.push({
        redditId: parsed.data.id,
        subreddit: parsed.data.subreddit,
        author: parsed.data.author?.trim() || "[deleted]",
        createdUtc: parsed.data.created_utc,
        score: parsed.data.score,
        permalink: parsed.data.permalink,
        title: parsed.data.title,
        body: parsed.data.selftext ?? "",
        commentCount: parsed.data.num_comments
      });
    }

    return {
      items,
      nextAfter: listing.after
    };
  }

  public async fetchNewCommentsPage(
    subreddit: string,
    after: string | null
  ): Promise<RedditPage<RedditComment>> {
    const listing = await this.fetchListing(`/r/${subreddit}/comments`, after);
    const items: RedditComment[] = [];

    for (const child of listing.children) {
      if (child.kind !== "t1") {
        continue;
      }

      const parsed = redditCommentDataSchema.safeParse(child.data);
      if (!parsed.success) {
        this.log.warn(
          {
            subreddit,
            issueCount: parsed.error.issues.length
          },
          "Skipped invalid Reddit comment payload"
        );
        continue;
      }

      items.push({
        redditId: parsed.data.id,
        subreddit: parsed.data.subreddit,
        author: parsed.data.author?.trim() || "[deleted]",
        createdUtc: parsed.data.created_utc,
        score: parsed.data.score,
        permalink: parsed.data.permalink,
        body: parsed.data.body ?? "",
        parentRedditId: stripRedditPrefix(parsed.data.parent_id),
        postRedditId: stripRedditPrefix(parsed.data.link_id)
      });
    }

    return {
      items,
      nextAfter: listing.after
    };
  }

  private async fetchListing(
    path: string,
    after: string | null
  ): Promise<{ after: string | null; children: Array<{ kind: string; data?: unknown }> }> {
    const query = new URLSearchParams({
      raw_json: "1",
      limit: String(REQUEST_LIMIT)
    });

    if (after) {
      query.set("after", after);
    }

    const url = `${REDDIT_API_BASE}${path}.json?${query.toString()}`;
    const payload = await this.requestJson(url);
    const parsed = listingResponseSchema.parse(payload);

    return {
      after: parsed.data.after,
      children: parsed.data.children
    };
  }

  private async requestJson(url: string): Promise<unknown> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
      try {
        await this.waitForRateLimitWindow();
        const token = await this.getAccessToken();

        const response = await this.limiter.schedule(() =>
          fetch(url, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "User-Agent": this.requestConfig.userAgent
            }
          })
        );

        this.updateRateLimitState(response.headers);

        if (response.status === 401) {
          this.accessToken = null;
          this.tokenExpiresAtMs = 0;
          lastError = new Error("Received 401 from Reddit API");
          continue;
        }

        if (response.status === 429) {
          const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
          const waitMs = retryAfterMs || this.getRateLimitWaitMs() || 1000 * attempt;
          this.log.warn({ attempt, waitMs }, "Reddit API rate limited request");
          await sleep(waitMs);
          lastError = new Error("Rate limited by Reddit API");
          continue;
        }

        if (response.status >= 500) {
          const waitMs = 1000 * attempt;
          this.log.warn({ attempt, status: response.status, waitMs }, "Reddit API transient server error");
          await sleep(waitMs);
          lastError = new Error(`Reddit API server error: ${response.status}`);
          continue;
        }

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Reddit API request failed (${response.status}): ${body.slice(0, 500)}`);
        }

        return await response.json();
      } catch (error) {
        const typedError = error instanceof Error ? error : new Error("Unknown Reddit request failure");
        lastError = typedError;

        if (attempt === MAX_REQUEST_ATTEMPTS) {
          break;
        }

        const waitMs = 500 * attempt;
        this.log.warn({ attempt, waitMs, err: typedError.message }, "Retrying Reddit API request after failure");
        await sleep(waitMs);
      }
    }

    throw lastError ?? new Error("Reddit API request failed");
  }

  private async getAccessToken(): Promise<string> {
    const refreshSkewMs = 30_000;
    if (this.accessToken && Date.now() + refreshSkewMs < this.tokenExpiresAtMs) {
      return this.accessToken;
    }

    const basicAuth = Buffer.from(
      `${this.requestConfig.clientId}:${this.requestConfig.clientSecret}`,
      "utf-8"
    ).toString("base64");

    const response = await this.limiter.schedule(() =>
      fetch(`${REDDIT_OAUTH_BASE}/api/v1/access_token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": this.requestConfig.userAgent
        },
        body: new URLSearchParams({
          grant_type: "client_credentials"
        }).toString()
      })
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to obtain Reddit access token (${response.status}): ${body.slice(0, 500)}`);
    }

    const payload = await response.json();
    const parsed = oauthResponseSchema.parse(payload);
    this.accessToken = parsed.access_token;
    this.tokenExpiresAtMs = Date.now() + parsed.expires_in * 1000;

    return this.accessToken;
  }

  private updateRateLimitState(headers: { get(name: string): string | null }): void {
    const remainingHeader = headers.get("x-ratelimit-remaining");
    const resetHeader = headers.get("x-ratelimit-reset");

    if (!remainingHeader || !resetHeader) {
      return;
    }

    const remaining = Number.parseFloat(remainingHeader);
    const resetSeconds = Number.parseFloat(resetHeader);

    if (Number.isNaN(remaining) || Number.isNaN(resetSeconds)) {
      return;
    }

    this.rateLimitState = {
      remaining,
      resetAtMs: Date.now() + resetSeconds * 1000
    };
  }

  private getRateLimitWaitMs(): number {
    if (!this.rateLimitState) {
      return 0;
    }

    if (this.rateLimitState.remaining > 1) {
      return 0;
    }

    const waitMs = this.rateLimitState.resetAtMs - Date.now();
    return waitMs > 0 ? waitMs : 0;
  }

  private async waitForRateLimitWindow(): Promise<void> {
    const waitMs = this.getRateLimitWaitMs();
    if (waitMs <= 0) {
      return;
    }

    this.log.debug({ waitMs }, "Waiting for Reddit API rate-limit window reset");
    await sleep(waitMs);
  }
}
