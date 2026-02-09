import { z } from "zod";
import { sentimentWindowSchema, tickerSymbolSchema } from "./common.js";

export const sentimentBalanceQuerySchema = z
  .object({
    symbol: tickerSymbolSchema,
    window: sentimentWindowSchema.default("24h")
  })
  .strict();

export const sentimentBalanceResponseSchema = z
  .object({
    ticker: z.string().min(1),
    window: sentimentWindowSchema,
    bullishCount: z.number().int().nonnegative(),
    bearishCount: z.number().int().nonnegative(),
    neutralCount: z.number().int().nonnegative(),
    bullishPercent: z.number().min(0).max(100),
    bearishPercent: z.number().min(0).max(100),
    neutralPercent: z.number().min(0).max(100)
  })
  .strict();

export type SentimentBalanceQuery = z.infer<typeof sentimentBalanceQuerySchema>;
export type SentimentBalanceResponse = z.infer<typeof sentimentBalanceResponseSchema>;
