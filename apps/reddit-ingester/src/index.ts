import { getIngesterEnv } from "@rsentiment/config";

const env = getIngesterEnv();

console.log(
  JSON.stringify({
    service: "reddit-ingester",
    status: "bootstrapped",
    region: env.GCP_REGION,
    rawPostsTopic: env.PUBSUB_RAW_POSTS_TOPIC,
    backfillDays: env.INGESTER_BACKFILL_DAYS
  })
);
