# rSentiment

Backend for a Reddit-driven stock/options sentiment system.

## Workspace

- `apps/reddit-ingester`: Reddit API ingestion + Pub/Sub publisher
- `apps/processor`: Pub/Sub consumer + classification + persistence + aggregation
- `apps/internal-api`: Internal read API for sentiment and ticker queries
- `packages/db`: Postgres client, query layer, migrations, and seed scripts
- `packages/contracts`: Shared schemas and TypeScript types
- `packages/config`: Environment and runtime configuration
- `packages/observability`: Logging, tracing, and metrics stubs

## Quick start

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev:ingester
```

See `ARCHITECTURE.md` for system architecture and locked decisions.
