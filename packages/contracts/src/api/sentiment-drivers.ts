import { z } from "zod";
import { sentimentLabels } from "../enums.js";
import { limitSchema, sentimentWindowSchema, tickerSymbolSchema } from "./common.js";

export const sentimentDriversQuerySchema = z
  .object({
    symbol: tickerSymbolSchema,
    window: sentimentWindowSchema.default("24h"),
    limit: limitSchema.default(20)
  })
  .strict();

export const sentimentDriverSchema = z
  .object({
    redditId: z.string().min(1),
    itemKind: z.enum(["post", "comment"]),
    subreddit: z.string().min(1),
    author: z.string().min(1),
    createdAt: z.string().datetime({ offset: true }),
    sentimentLabel: z.enum(sentimentLabels),
    weightedScore: z.number(),
    engagementScore: z.number().int(),
    permalink: z.string().min(1)
  })
  .strict();

export const sentimentDriversResponseSchema = z
  .object({
    ticker: z.string().min(1),
    window: sentimentWindowSchema,
    drivers: z.array(sentimentDriverSchema)
  })
  .strict();

export type SentimentDriversQuery = z.infer<typeof sentimentDriversQuerySchema>;
export type SentimentDriver = z.infer<typeof sentimentDriverSchema>;
export type SentimentDriversResponse = z.infer<typeof sentimentDriversResponseSchema>;
