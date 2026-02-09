# Project Tasks

Tracking document for implementation progress against `ARCHITECTURE.md`.

## Status Key

- `[x]` done
- `[~]` in progress
- `[ ]` not started

## Locked Decisions

- [x] Database: Drizzle ORM + Drizzle migrations
- [x] Ingestion scope: posts and comments from day 1
- [x] Ticker extraction: LLM-assisted immediately
- [x] Edits/deletes: ignored in v1
- [x] Aggregation storage: relational tables (no JSONB core logic)
- [x] Freshness target: P95 end-to-end <= 10 minutes
- [x] Retry policy: retry transient failures + DLQ after 10 attempts
- [x] Environments: local/dev and prod
- [x] API shape: REST only
- [x] Interim strategy taxonomy: `OPTIONS | UNKNOWN`
- [x] No `processing_failures` table in v1 (log + DLQ approach)

## Completed

### Monorepo Bootstrap

- [x] PNPM workspace and root scripts
- [x] TypeScript base config (`strict`, NodeNext, ESM)
- [x] Initial app packages:
  - [x] `apps/reddit-ingester`
  - [x] `apps/processor`
  - [x] `apps/internal-api`
- [x] Initial shared packages:
  - [x] `packages/config`
  - [x] `packages/contracts`
  - [x] `packages/observability`
  - [x] `packages/db`
- [x] Local Postgres via `docker-compose.yml`

### Database Foundation (Milestone 1)

- [x] Drizzle tooling wired in `packages/db/package.json`
- [x] Drizzle config added: `packages/db/drizzle.config.ts`
- [x] Core v1 schema defined: `packages/db/src/schema.ts`
- [x] Initial SQL migration generated:
  - [x] `packages/db/migrations/0000_cynical_mauler.sql`
- [x] Migration metadata generated under `packages/db/migrations/meta/`
- [x] Seed script implemented and idempotent: `packages/db/seed/subreddits.ts`
- [x] DB client upgraded to Drizzle: `packages/db/src/client.ts`
- [x] Query example moved to Drizzle: `packages/db/src/queries/tickers.ts`

### Validation Completed

- [x] `docker compose up -d`
- [x] `pnpm db:migrate`
- [x] `pnpm db:seed` (verified idempotent)
- [x] Seed sanity check: 4 rows in `subreddits`
- [x] `pnpm typecheck`
- [x] `pnpm build`

### Contracts and Config Hardening (Milestone 2)

- [x] Finalized Pub/Sub contracts for raw post/comment payloads
- [x] Finalized processed classification contract (sentiment + ticker extraction + options)
- [x] Added API response/query contracts for v1 internal endpoints
- [x] Added boundary validation usage in service entrypoints
- [x] Tightened service-specific env validation and fail-fast startup behavior

## In Progress

- [~] Complete Milestone 3 sign-off (Reddit-source smoke + targeted ingester tests)

## Recently Validated

- [x] Mock-source smoke run in `apps/reddit-ingester` succeeded (`INGESTER_SOURCE=mock`)
- [x] Verified publish flow for both posts/comments (wallstreetbets: 36 posts, 320 comments)
- [x] Verified `subreddits.last_crawled_at` advances after successful publish

## Next Session Start Here

1. Add targeted tests for normalization and crawl lower-bound behavior
2. Re-run `INGESTER_SOURCE=mock pnpm dev:ingester` after tests/changes
3. Run `INGESTER_SOURCE=reddit pnpm dev:ingester` once Reddit credentials are approved
4. Verify one enabled subreddit publishes both post/comment messages in Reddit mode
5. Capture any fixes from Reddit-source smoke run

## Next Up (Priority Order)

### Milestone 2: Contracts and Config Hardening

- [x] Finalize Pub/Sub contracts for raw post/comment payloads
- [x] Finalize processed classification contract (sentiment + ticker extraction + options)
- [x] Add API response contracts for all v1 endpoints
- [x] Ensure boundary validation via Zod in all services
- [x] Tighten env validation and startup failure behavior per service

### Milestone 3: Reddit Ingester MVP

- [x] Implement Reddit OAuth client and token refresh
- [x] Implement rate limit handling
- [x] Read enabled subreddits from DB
- [x] Implement initial 3-day backfill
- [x] Implement forward-only incremental ingestion
- [x] Publish validated raw post/comment messages to Pub/Sub
- [x] Add `INGESTER_SOURCE=mock` local fallback for development without Reddit credentials

### Milestone 4: Processor MVP

- [ ] Consume Pub/Sub with explicit ack/nack behavior
- [ ] Persist immutable posts/comments
- [ ] Persist append-only `metrics_snapshots`
- [ ] Integrate Vertex for sentiment + ticker extraction + options interpretation
- [ ] Validate model output with Zod before writes
- [ ] Persist classifications and option legs
- [ ] Persist ticker mappings with confidence

### Milestone 5: Hourly Aggregation

- [ ] Implement weighted score formula in aggregation logic
- [ ] Upsert `hourly_ticker_aggregates` by `(ticker, hour_bucket)`
- [ ] Upsert `hourly_ticker_strategy_aggregates` by `(ticker, strategy, hour_bucket)`
- [ ] Schedule frequent recomputation for active current-hour windows

### Milestone 6: Internal API (REST)

- [ ] Health and readiness route hardening
- [ ] Trending tickers endpoint
- [ ] Sentiment-over-time endpoint
- [ ] Bullish vs bearish endpoint
- [ ] Options-only sentiment endpoint
- [ ] Strategy breakdown endpoint
- [ ] High-engagement drivers endpoint

### Milestone 7: Infrastructure (Terraform)

- [ ] Add Terraform layout for dev/prod environments
- [ ] Provision Cloud SQL (Postgres)
- [ ] Provision Pub/Sub topics/subscriptions + DLQ
- [ ] Provision Cloud Run services + IAM
- [ ] Wire secrets/env vars into service deployments

### Milestone 8: Reliability and Quality

- [ ] Standardize structured logging across apps
- [ ] Add critical metrics and tracing spans
- [ ] Add targeted Vitest tests in changed areas
- [ ] Add CI workflow: install, typecheck, build, tests

## Open Questions

- [ ] Define long-term strategy taxonomy beyond `OPTIONS | UNKNOWN`
