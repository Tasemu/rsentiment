import { rawCommentSchema, rawPostSchema, type RawComment, type RawPost } from "@rsentiment/contracts";
import type { RedditComment, RedditPost } from "../reddit-client.js";

function toIsoTimestamp(createdUtcSeconds: number): string {
  return new Date(createdUtcSeconds * 1000).toISOString();
}

function toPermalink(permalink: string): string {
  if (permalink.startsWith("http://") || permalink.startsWith("https://")) {
    return permalink;
  }

  return `https://reddit.com${permalink}`;
}

export function normalizeRawPost(post: RedditPost, ingestedAt: Date): RawPost {
  return rawPostSchema.parse({
    messageVersion: "1",
    source: "reddit",
    itemKind: "post",
    redditId: post.redditId,
    subreddit: post.subreddit,
    author: post.author,
    createdAt: toIsoTimestamp(post.createdUtc),
    ingestedAt: ingestedAt.toISOString(),
    score: post.score,
    permalink: toPermalink(post.permalink),
    title: post.title,
    body: post.body,
    commentCount: post.commentCount
  });
}

export function normalizeRawComment(comment: RedditComment, ingestedAt: Date): RawComment {
  return rawCommentSchema.parse({
    messageVersion: "1",
    source: "reddit",
    itemKind: "comment",
    redditId: comment.redditId,
    subreddit: comment.subreddit,
    author: comment.author,
    createdAt: toIsoTimestamp(comment.createdUtc),
    ingestedAt: ingestedAt.toISOString(),
    score: comment.score,
    permalink: toPermalink(comment.permalink),
    body: comment.body,
    parentRedditId: comment.parentRedditId,
    postRedditId: comment.postRedditId
  });
}
