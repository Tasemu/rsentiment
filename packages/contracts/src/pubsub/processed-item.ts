import { z } from "zod";
import { sentimentLabels } from "../enums.js";

export const processedItemSchema = z.object({
  redditId: z.string().min(1),
  sentimentLabel: z.enum(sentimentLabels),
  sentimentScore: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  isOptions: z.boolean(),
  strategy: z.string().nullable(),
  timeHorizon: z.string().nullable(),
  tickerSymbols: z.array(z.string().min(1)).default([])
});

export type ProcessedItem = z.infer<typeof processedItemSchema>;
