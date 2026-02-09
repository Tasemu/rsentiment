import { z } from "zod";
import { strategyLabels } from "../enums.js";
import { sentimentWindowSchema, tickerSymbolSchema } from "./common.js";

export const strategyBreakdownQuerySchema = z
  .object({
    symbol: tickerSymbolSchema,
    window: sentimentWindowSchema.default("24h")
  })
  .strict();

export const strategyBreakdownItemSchema = z
  .object({
    strategy: z.enum(strategyLabels),
    mentions: z.number().int().nonnegative(),
    avgWeightedScore: z.number()
  })
  .strict();

export const strategyBreakdownResponseSchema = z
  .object({
    ticker: z.string().min(1),
    window: sentimentWindowSchema,
    breakdown: z.array(strategyBreakdownItemSchema)
  })
  .strict();

export type StrategyBreakdownQuery = z.infer<typeof strategyBreakdownQuerySchema>;
export type StrategyBreakdownItem = z.infer<typeof strategyBreakdownItemSchema>;
export type StrategyBreakdownResponse = z.infer<typeof strategyBreakdownResponseSchema>;
