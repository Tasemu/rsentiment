import { z } from "zod";

export const healthResponseSchema = z
  .object({
    ok: z.literal(true),
    service: z.enum(["internal-api", "reddit-ingester", "processor"]),
    timestamp: z.string().datetime({ offset: true })
  })
  .strict();

export type HealthResponse = z.infer<typeof healthResponseSchema>;
