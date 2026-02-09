import { z } from "zod";

export const sentimentWindowSchema = z.enum(["1h", "6h", "24h", "7d"]);

export const tickerSymbolSchema = z
  .string()
  .min(1)
  .max(10)
  .transform((value) => value.toUpperCase());

export const limitSchema = z.coerce.number().int().positive().max(100).default(20);

export type SentimentWindow = z.infer<typeof sentimentWindowSchema>;
