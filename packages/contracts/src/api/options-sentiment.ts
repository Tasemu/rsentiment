import { z } from "zod";
import { sentimentLabels } from "../enums.js";
import { sentimentWindowSchema, tickerSymbolSchema } from "./common.js";

export const optionsSentimentQuerySchema = z
  .object({
    symbol: tickerSymbolSchema,
    window: sentimentWindowSchema.default("24h")
  })
  .strict();

export const optionsSentimentResponseSchema = z
  .object({
    ticker: z.string().min(1),
    window: sentimentWindowSchema,
    totalOptionsMentions: z.number().int().nonnegative(),
    avgWeightedScore: z.number(),
    sentimentLabel: z.enum(sentimentLabels)
  })
  .strict();

export type OptionsSentimentQuery = z.infer<typeof optionsSentimentQuerySchema>;
export type OptionsSentimentResponse = z.infer<typeof optionsSentimentResponseSchema>;
