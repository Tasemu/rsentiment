# HANDOFF.md

Implementation handoff for future agents working without prior chat context.

Use these docs together:

- `ARCHITECTURE.md` for locked platform/system decisions
- `AGENTS.md` for coding conventions and command usage
- `TASKS.md` for progress tracking and milestone checklist

## Current State (as of this handoff)

- Milestone 1 complete: Drizzle database foundation
- Milestone 2 complete: contracts and config hardening
- Milestone 3 implemented in code: Reddit ingester MVP
- Immediate next step: run end-to-end local smoke with real Reddit/GCP credentials

## Locked Product/Platform Decisions

- Database: Drizzle ORM + Drizzle migrations
- Ingestion: posts and comments from day 1
- Ticker extraction: LLM-assisted immediately
- Edits/deletes: ignored in v1
- Aggregation storage: relational tables (no JSONB core logic)
- Freshness target: P95 end-to-end <= 10 minutes
- Retry policy: transient retries + DLQ after 10 attempts
- Environments: local/dev and prod
- API shape: REST only
- Strategy taxonomy (interim): `OPTIONS | UNKNOWN`
- Explicitly accepted tradeoff: occasional dropped records are acceptable in v1

## What Is Implemented

### Database + Migrations

- Drizzle scripts wired in `packages/db/package.json`
- Drizzle config in `packages/db/drizzle.config.ts`
- Schema in `packages/db/src/schema.ts`
- Initial migration in `packages/db/migrations/0000_cynical_mauler.sql`
- Seed script is idempotent in `packages/db/seed/subreddits.ts`

Implemented tables:

- `subreddits`
- `posts`
- `comments`
- `metrics_snapshots` (append-only)
- `tickers`
- `post_ticker_map`
- `comment_ticker_map`
- `classifications`
- `option_legs`
- `hourly_ticker_aggregates`
- `hourly_ticker_strategy_aggregates`

### Contracts (Milestone 2)

Pub/Sub schemas:

- `packages/contracts/src/pubsub/raw-post.ts`
- `packages/contracts/src/pubsub/raw-comment.ts`
- `packages/contracts/src/pubsub/raw-item.ts` (discriminated union)
- `packages/contracts/src/pubsub/processed-item.ts`

API query/response schemas:

- `packages/contracts/src/api/health.ts`
- `packages/contracts/src/api/ticker-sentiment.ts`
- `packages/contracts/src/api/trending-tickers.ts`
- `packages/contracts/src/api/sentiment-balance.ts`
- `packages/contracts/src/api/options-sentiment.ts`
- `packages/contracts/src/api/strategy-breakdown.ts`
- `packages/contracts/src/api/sentiment-drivers.ts`

### Config Validation (Milestone 2)

- Service-specific env schemas in `packages/config/src/env.ts`
  - `getIngesterEnv`
  - `getProcessorEnv`
  - `getInternalApiEnv`
- App entrypoints now parse env at startup (fail fast for missing required vars)

## Known Operational Notes

- Drizzle rollback is intentionally unsupported. Use corrective forward migrations.
- Drizzle Studio default port is `4983`; if busy, pass `--port`.
- Env schemas use `.passthrough()` to allow shell/PNPM extra variables while validating required keys.

## Milestone 3 Implementation (Reddit Ingester)

Implemented in `apps/reddit-ingester`:

1. `src/reddit-client.ts`
   - Reddit OAuth token fetch/refresh
   - Authenticated Reddit API requests
   - 429/transient retry handling and rate-limit aware pacing
2. `src/crawl/subreddits.ts`
   - Load enabled subreddits from DB
   - Update `subreddits.last_crawled_at` after successful publish
3. `src/crawl/posts.ts` + `src/crawl/comments.ts`
   - Pagination and lower-bound aware crawl logic
4. `src/normalize/raw-items.ts`
   - Normalize Reddit payloads into `rawPostSchema`/`rawCommentSchema` shapes
5. `src/publish/raw-items.ts`
   - Validate with `rawItemSchema`
   - Publish JSON payloads to Pub/Sub
6. `src/index.ts`
   - Continuous polling loop (60s cadence)
   - Initial 3-day backfill when `last_crawled_at` is null
   - Forward-only incremental polling with overlap window to reduce boundary misses
   - Per-subreddit failure isolation and structured logging
   - Supports `INGESTER_SOURCE=mock` for local development without Reddit credentials

Remaining Milestone 3 validation:

- Run one enabled subreddit end-to-end locally
- Confirm both posts and comments are published
- Confirm watermarks advance only on successful publish

## Milestone 4 Preview (Processor)

- Consume Pub/Sub with explicit ack/nack
- Persist immutable content and append-only metrics snapshots
- Call Vertex for sentiment + ticker extraction + options parsing
- Validate model output with `processedItemSchema` before writes

## Validation Commands

Run from repo root.

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm typecheck
pnpm build
```

Useful local checks:

```bash
pnpm --filter @rsentiment/db run db:studio -- --port 4984
GCP_PROJECT_ID=local DATABASE_URL=postgres://postgres:postgres@localhost:5432/rsentiment pnpm dev:api
curl localhost:8080/health
```

## Important Non-Goals for v1

- No user auth/accounts
- No alerts/backtesting
- No BigQuery/alternate data stores
- No non-Reddit ingestion sources
