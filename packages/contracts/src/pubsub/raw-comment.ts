import { z } from "zod";

const baseRawRedditItemSchema = z
  .object({
    messageVersion: z.literal("1"),
    source: z.literal("reddit"),
    itemKind: z.literal("comment"),
    redditId: z.string().min(1),
    subreddit: z.string().min(1),
    author: z.string().min(1),
    createdAt: z.string().datetime({ offset: true }),
    ingestedAt: z.string().datetime({ offset: true }),
    score: z.number().int(),
    permalink: z.string().min(1)
  })
  .strict();

export const rawCommentSchema = baseRawRedditItemSchema
  .extend({
    body: z.string(),
    parentRedditId: z.string().min(1),
    postRedditId: z.string().min(1)
  })
  .strict();

export type RawComment = z.infer<typeof rawCommentSchema>;
