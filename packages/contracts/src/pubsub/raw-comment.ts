import { z } from "zod";

export const rawCommentSchema = z.object({
  redditId: z.string().min(1),
  parentRedditId: z.string().min(1),
  subreddit: z.string().min(1),
  author: z.string().min(1),
  createdAt: z.string().datetime(),
  body: z.string(),
  score: z.number().int().nonnegative()
});

export type RawComment = z.infer<typeof rawCommentSchema>;
