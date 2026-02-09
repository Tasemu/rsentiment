import { z } from "zod";

export const tickerSentimentPointSchema = z.object({
  ticker: z.string().min(1),
  hourBucket: z.string().datetime(),
  avgWeightedScore: z.number(),
  bullishCount: z.number().int().nonnegative(),
  bearishCount: z.number().int().nonnegative(),
  neutralCount: z.number().int().nonnegative(),
  totalMentions: z.number().int().nonnegative()
});

export type TickerSentimentPoint = z.infer<typeof tickerSentimentPointSchema>;
