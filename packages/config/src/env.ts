import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  GCP_PROJECT_ID: z.string().min(1),
  GCP_REGION: z.string().default("europe-west2"),
  PUBSUB_RAW_POSTS_TOPIC: z.string().default("raw-posts"),
  DATABASE_URL: z.string().url(),
  REDDIT_CLIENT_ID: z.string().min(1),
  REDDIT_CLIENT_SECRET: z.string().min(1),
  REDDIT_USER_AGENT: z.string().min(1),
  VERTEX_MODEL: z.string().default("gemini-1.5-flash")
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(env);
}
