import Fastify from "fastify";
import { getInternalApiEnv } from "@rsentiment/config";
import { healthResponseSchema } from "@rsentiment/contracts";

const app = Fastify({ logger: false });

const env = getInternalApiEnv();

app.get("/health", async () => {
  return healthResponseSchema.parse({
    ok: true,
    service: "internal-api",
    timestamp: new Date().toISOString()
  });
});

const port = env.PORT;

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    console.log(`internal-api listening on ${port}`);
  })
  .catch((error) => {
    console.error("internal-api failed to start", error);
    process.exit(1);
  });
