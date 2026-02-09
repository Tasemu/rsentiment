import { z } from "zod";
import { optionSides, optionTypes, sentimentLabels, strategyLabels } from "../enums.js";

const tickerMentionSchema = z
  .object({
    symbol: z.string().min(1),
    confidence: z.number().min(0).max(1)
  })
  .strict();

const optionLegSchema = z
  .object({
    side: z.enum(optionSides),
    type: z.enum(optionTypes),
    strike: z.number().positive().nullable(),
    expiry: z.string().date().nullable(),
    quantity: z.number().int().positive().nullable()
  })
  .strict();

const modelMetadataSchema = z
  .object({
    provider: z.literal("vertex-ai"),
    model: z.string().min(1)
  })
  .strict();

export const processedItemSchema = z
  .object({
    messageVersion: z.literal("1"),
    source: z.literal("reddit"),
    itemKind: z.enum(["post", "comment"]),
    redditId: z.string().min(1),
    subreddit: z.string().min(1),
    classifiedAt: z.string().datetime({ offset: true }),
    sentimentLabel: z.enum(sentimentLabels),
    sentimentScore: z.number().min(-1).max(1),
    confidence: z.number().min(0).max(1),
    strategy: z.enum(strategyLabels).default("UNKNOWN"),
    timeHorizon: z.string().min(1).nullable(),
    isOptions: z.boolean(),
    tickerMentions: z.array(tickerMentionSchema),
    optionLegs: z.array(optionLegSchema).default([]),
    model: modelMetadataSchema
  })
  .strict();

export type ProcessedItem = z.infer<typeof processedItemSchema>;
export type TickerMention = z.infer<typeof tickerMentionSchema>;
export type OptionLeg = z.infer<typeof optionLegSchema>;
