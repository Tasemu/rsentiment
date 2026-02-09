import { z } from "zod";
import { sentimentLabels } from "../enums.js";
import { limitSchema, sentimentWindowSchema } from "./common.js";

export const trendingTickersQuerySchema = z
  .object({
    window: sentimentWindowSchema.default("24h"),
    limit: limitSchema.default(20)
  })
  .strict();

export const trendingTickerSchema = z
  .object({
    rank: z.number().int().positive(),
    symbol: z.string().min(1),
    totalMentions: z.number().int().nonnegative(),
    avgWeightedScore: z.number(),
    sentimentLabel: z.enum(sentimentLabels)
  })
  .strict();

export const trendingTickersResponseSchema = z
  .object({
    window: sentimentWindowSchema,
    tickers: z.array(trendingTickerSchema)
  })
  .strict();

export type TrendingTickersQuery = z.infer<typeof trendingTickersQuerySchema>;
export type TrendingTicker = z.infer<typeof trendingTickerSchema>;
export type TrendingTickersResponse = z.infer<typeof trendingTickersResponseSchema>;
