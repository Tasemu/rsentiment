import type {
  RedditApiClient,
  RedditComment,
  RedditPage,
  RedditPost
} from "./reddit-client.js";

const PAGE_SIZE = 100;
const MOCK_POST_COUNT = 36;
const MOCK_COMMENT_COUNT = 320;

type MockSubredditData = {
  posts: RedditPost[];
  comments: RedditComment[];
};

function parseAfter(after: string | null): number {
  if (!after) {
    return 0;
  }

  if (!after.startsWith("mock_")) {
    return 0;
  }

  const parsed = Number.parseInt(after.replace("mock_", ""), 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function formatAfter(nextIndex: number, length: number): string | null {
  if (nextIndex >= length) {
    return null;
  }

  return `mock_${nextIndex}`;
}

function getPage<T>(items: T[], after: string | null): RedditPage<T> {
  const start = parseAfter(after);
  const end = start + PAGE_SIZE;

  return {
    items: items.slice(start, end),
    nextAfter: formatAfter(end, items.length)
  };
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function createMockData(subreddit: string): MockSubredditData {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const normalizedSubreddit = normalizeName(subreddit);
  const posts: RedditPost[] = [];

  for (let index = 0; index < MOCK_POST_COUNT; index += 1) {
    const redditId = `${normalizedSubreddit}p${String(index + 1).padStart(4, "0")}`;
    const createdUtc = nowSeconds - index * 40 * 60;

    posts.push({
      redditId,
      subreddit,
      author: `mock_author_${(index % 20) + 1}`,
      createdUtc,
      score: 10 + (index % 200),
      permalink: `/r/${subreddit}/comments/${redditId}/mock-post-${index + 1}/`,
      title: `[mock] ${subreddit} discussion ${index + 1}`,
      body: `Mock post content ${index + 1} for ${subreddit}`,
      commentCount: 5 + (index % 80)
    });
  }

  const comments: RedditComment[] = [];

  for (let index = 0; index < MOCK_COMMENT_COUNT; index += 1) {
    const redditId = `${normalizedSubreddit}c${String(index + 1).padStart(5, "0")}`;
    const parentPost = posts[index % posts.length];
    const createdUtc = nowSeconds - index * 4 * 60;

    comments.push({
      redditId,
      subreddit,
      author: `mock_commenter_${(index % 45) + 1}`,
      createdUtc,
      score: index % 60,
      permalink: `${parentPost.permalink}${redditId}/`,
      body: `Mock comment ${index + 1} on ${subreddit}`,
      parentRedditId: parentPost.redditId,
      postRedditId: parentPost.redditId
    });
  }

  return {
    posts,
    comments
  };
}

export class MockRedditClient implements RedditApiClient {
  private readonly subredditData = new Map<string, MockSubredditData>();

  public async fetchNewPostsPage(subreddit: string, after: string | null): Promise<RedditPage<RedditPost>> {
    const data = this.getData(subreddit);
    return getPage(data.posts, after);
  }

  public async fetchNewCommentsPage(
    subreddit: string,
    after: string | null
  ): Promise<RedditPage<RedditComment>> {
    const data = this.getData(subreddit);
    return getPage(data.comments, after);
  }

  private getData(subreddit: string): MockSubredditData {
    const cached = this.subredditData.get(subreddit);
    if (cached) {
      return cached;
    }

    const created = createMockData(subreddit);
    this.subredditData.set(subreddit, created);
    return created;
  }
}
