import { z } from "zod";

export const rawPostSchema = z.object({
  redditId: z.string().min(1),
  subreddit: z.string().min(1),
  author: z.string().min(1),
  createdAt: z.string().datetime(),
  title: z.string(),
  body: z.string().default(""),
  score: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative()
});

export type RawPost = z.infer<typeof rawPostSchema>;
