import { getBaseEnv, getIngesterEnv } from "./env.js";

export function getGcpConfig() {
  const env = getBaseEnv();
  return {
    projectId: env.GCP_PROJECT_ID,
    region: env.GCP_REGION
  };
}

export function getIngesterGcpConfig() {
  const env = getIngesterEnv();
  return {
    projectId: env.GCP_PROJECT_ID,
    region: env.GCP_REGION,
    rawPostsTopic: env.PUBSUB_RAW_POSTS_TOPIC
  };
}
