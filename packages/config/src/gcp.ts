import { getEnv } from "./env.js";

export function getGcpConfig() {
  const env = getEnv();
  return {
    projectId: env.GCP_PROJECT_ID,
    region: env.GCP_REGION,
    rawPostsTopic: env.PUBSUB_RAW_POSTS_TOPIC
  };
}
