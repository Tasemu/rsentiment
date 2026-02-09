import { z } from "zod";

const baseRawRedditItemSchema = z
  .object({
    messageVersion: z.literal("1"),
    source: z.literal("reddit"),
    itemKind: z.literal("post"),
    redditId: z.string().min(1),
    subreddit: z.string().min(1),
    author: z.string().min(1),
    createdAt: z.string().datetime({ offset: true }),
    ingestedAt: z.string().datetime({ offset: true }),
    score: z.number().int(),
    permalink: z.string().min(1)
  })
  .strict();

export const rawPostSchema = baseRawRedditItemSchema
  .extend({
    title: z.string().min(1),
    body: z.string().default(""),
    commentCount: z.number().int().nonnegative()
  })
  .strict();

export type RawPost = z.infer<typeof rawPostSchema>;
