import { z } from "zod";
import { sentimentLabels } from "../enums.js";
import { sentimentWindowSchema, tickerSymbolSchema } from "./common.js";

export const tickerSentimentPointSchema = z.object({
  ticker: z.string().min(1),
  hourBucket: z.string().datetime(),
  avgWeightedScore: z.number(),
  bullishCount: z.number().int().nonnegative(),
  bearishCount: z.number().int().nonnegative(),
  neutralCount: z.number().int().nonnegative(),
  totalMentions: z.number().int().nonnegative(),
  sentimentLabel: z.enum(sentimentLabels)
});

export const tickerSentimentQuerySchema = z
  .object({
    symbol: tickerSymbolSchema,
    window: sentimentWindowSchema.default("24h")
  })
  .strict();

export const tickerSentimentResponseSchema = z
  .object({
    ticker: z.string().min(1),
    window: sentimentWindowSchema,
    points: z.array(tickerSentimentPointSchema)
  })
  .strict();

export type TickerSentimentPoint = z.infer<typeof tickerSentimentPointSchema>;
export type TickerSentimentQuery = z.infer<typeof tickerSentimentQuerySchema>;
export type TickerSentimentResponse = z.infer<typeof tickerSentimentResponseSchema>;
