import Fastify from "fastify";

const app = Fastify({ logger: false });

app.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 8080);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    console.log(`internal-api listening on ${port}`);
  })
  .catch((error) => {
    console.error("internal-api failed to start", error);
    process.exit(1);
  });
