import { getProcessorEnv } from "@rsentiment/config";

const env = getProcessorEnv();

console.log(
  JSON.stringify({
    service: "processor",
    status: "bootstrapped",
    region: env.GCP_REGION,
    subscription: env.PUBSUB_RAW_POSTS_SUBSCRIPTION,
    dlqTopic: env.PUBSUB_DLQ_TOPIC,
    vertexModel: env.VERTEX_MODEL
  })
);
