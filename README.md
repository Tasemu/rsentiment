# rSentiment

Backend for a Reddit-driven stock/options sentiment system.

This repository is currently in active development and is used for local testing and staged backend delivery.

## Project status

- Milestone 1 complete: Drizzle schema + migrations + idempotent seed
- Milestone 2 complete: contracts + env validation hardening
- Milestone 3 implemented in code: Reddit ingester MVP
- Milestone 3 local smoke validated with `INGESTER_SOURCE=mock`
- Remaining Milestone 3 sign-off: live Reddit-source smoke after API credentials are approved

For continuation context, see `HANDOFF.md` and `TASKS.md`.

## Reddit API use

- Purpose: ingest public Reddit posts and comments from configured finance-related subreddits.
- Access pattern: read-only ingestion via official Reddit API + OAuth.
- Current scope: sentiment classification and aggregation for internal analytics.
- Not in scope: trading execution, user accounts, user profiling, or ad targeting.

## Data handling

- Data collected: post/comment content, subreddit, author handle, timestamps, and engagement metadata.
- Data sources: official Reddit API only.
- Data storage: PostgreSQL (development/local and planned cloud environments).
- Sensitive data: no Reddit passwords, no refresh tokens, and no user-entered secrets are collected.

## Compliance and safety notes

- This project is not financial advice.
- API credentials are provided via environment variables and must never be committed.
- This repo uses structured logging and avoids logging credentials/secrets.

## Contact

- For questions about this project or API usage, open an issue in this repository.

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
INGESTER_SOURCE=mock pnpm dev:ingester
```

Run ingester in local mock-source mode (no Reddit credentials required):

```bash
INGESTER_SOURCE=mock pnpm dev:ingester
```

For local-only message flow, run Pub/Sub emulator and create topic:

```bash
gcloud beta emulators pubsub start --host-port=127.0.0.1:8085 --project=rsentiment-local
curl -X PUT "http://127.0.0.1:8085/v1/projects/rsentiment-local/topics/raw-posts"
PUBSUB_EMULATOR_HOST=127.0.0.1:8085 GCP_PROJECT_ID=rsentiment-local INGESTER_SOURCE=mock pnpm dev:ingester
```

Run ingester against Reddit API (requires approved Reddit app credentials):

```bash
INGESTER_SOURCE=reddit \
REDDIT_CLIENT_ID=your-client-id \
REDDIT_CLIENT_SECRET=your-client-secret \
REDDIT_USER_AGENT="macos:rsentiment-local:0.1 (by u/your_username)" \
pnpm dev:ingester
```

## Database (Drizzle)

- Generate migration SQL from schema: `pnpm --filter @rsentiment/db run db:generate`
- Apply migrations: `pnpm db:migrate`
- Seed subreddits: `pnpm db:seed`

## Smoke tests available now

```bash
pnpm typecheck
pnpm build
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

Internal API startup and health check:

```bash
GCP_PROJECT_ID=local DATABASE_URL=postgres://postgres:postgres@localhost:5432/rsentiment pnpm dev:api
curl localhost:8080/health
```

See `ARCHITECTURE.md` for system architecture and locked decisions.
