import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]);

const baseEnvSchema = z
  .object({
    NODE_ENV: nodeEnvSchema.default("development"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    GCP_PROJECT_ID: z.string().min(1),
    GCP_REGION: z.string().default("europe-west2")
  })
  .strict();

const dbEnvSchema = z
  .object({
    DATABASE_URL: z.string().url()
  })
  .strict();

export const ingesterEnvSchema = baseEnvSchema
  .merge(dbEnvSchema)
  .extend({
    PUBSUB_RAW_POSTS_TOPIC: z.string().min(1).default("raw-posts"),
    REDDIT_CLIENT_ID: z.string().min(1),
    REDDIT_CLIENT_SECRET: z.string().min(1),
    REDDIT_USER_AGENT: z.string().min(1),
    INGESTER_BACKFILL_DAYS: z.coerce.number().int().positive().default(3)
  })
  .strict();

export const processorEnvSchema = baseEnvSchema
  .merge(dbEnvSchema)
  .extend({
    PUBSUB_RAW_POSTS_SUBSCRIPTION: z.string().min(1).default("raw-posts-sub"),
    PUBSUB_DLQ_TOPIC: z.string().min(1).default("raw-posts-dlq"),
    VERTEX_MODEL: z.string().min(1).default("gemini-1.5-flash")
  })
  .strict();

export const internalApiEnvSchema = baseEnvSchema
  .merge(dbEnvSchema)
  .extend({
    PORT: z.coerce.number().int().min(1).max(65535).default(8080)
  })
  .strict();

type EnvSource = Record<string, string | undefined>;

function parseEnv<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  env: EnvSource,
  serviceName: string
): z.output<TSchema> {
  const parsed = schema.safeParse(env);

  if (parsed.success) {
    return parsed.data;
  }

  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment for ${serviceName}: ${details}`);
}

export type BaseEnv = z.infer<typeof baseEnvSchema>;
export type IngesterEnv = z.infer<typeof ingesterEnvSchema>;
export type ProcessorEnv = z.infer<typeof processorEnvSchema>;
export type InternalApiEnv = z.infer<typeof internalApiEnvSchema>;

export function getBaseEnv(env: NodeJS.ProcessEnv = process.env): BaseEnv {
  return parseEnv(baseEnvSchema, env, "base");
}

export function getIngesterEnv(env: NodeJS.ProcessEnv = process.env): IngesterEnv {
  return parseEnv(ingesterEnvSchema, env, "reddit-ingester");
}

export function getProcessorEnv(env: NodeJS.ProcessEnv = process.env): ProcessorEnv {
  return parseEnv(processorEnvSchema, env, "processor");
}

export function getInternalApiEnv(env: NodeJS.ProcessEnv = process.env): InternalApiEnv {
  return parseEnv(internalApiEnvSchema, env, "internal-api");
}
