# AGENTS.md
Guide for coding agents operating in this repository.
Use `ARCHITECTURE.md` as the source of truth for locked system decisions.

## Repo Overview
- Package manager: `pnpm` workspaces
- Language: TypeScript (`strict: true`)
- Module mode: ESM (`"type": "module"`, `NodeNext`)
- Runtime target: Node.js on Cloud Run
- Queue: Pub/Sub
- Database: PostgreSQL
- Cloud region target: `europe-west2`

Workspace packages:
- `apps/reddit-ingester`
- `apps/processor`
- `apps/internal-api`
- `packages/config`
- `packages/contracts`
- `packages/observability`
- `packages/db`

Current implementation status:
- Milestone 1 complete (Drizzle schema/migrations/seed)
- Milestone 2 complete (contracts + env validation hardening)
- Milestone 3 ingester MVP is implemented in code
- Remaining Milestone 3 work: Reddit-source smoke validation + targeted ingester tests

Continuation docs:
- `HANDOFF.md` has session-independent implementation context
- `TASKS.md` has the live backlog/progress checklist

## Build, Lint, Typecheck, Test
Run commands from repo root.

Install:
- `pnpm install`

All-workspace checks:
- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`

Current state of scripts:
- `lint` scripts are placeholders in all workspace packages.
- `test` scripts are placeholders in all workspace packages.
- Vitest is installed at root and should be used directly for targeted tests.

Dev entrypoints:
- `pnpm dev:ingester`
- `pnpm dev:processor`
- `pnpm dev:api`

DB scripts:
- `pnpm db:migrate` (Drizzle migration apply)
- `pnpm db:rollback` (intentionally unsupported; create corrective migration)
- `pnpm db:seed`
- `pnpm --filter @rsentiment/db run db:generate` (generate SQL from Drizzle schema)
- `pnpm --filter @rsentiment/db run db:studio` (optional local schema explorer)

Package-scoped examples:
- `pnpm --filter @rsentiment/processor build`
- `pnpm --filter @rsentiment/internal-api typecheck`
- `pnpm --filter @rsentiment/db run db:seed`

### Single test execution (important)
Single test file:
- `pnpm --filter @rsentiment/processor exec vitest run src/foo.test.ts`

Single test name in a file:
- `pnpm --filter @rsentiment/processor exec vitest run src/foo.test.ts -t "handles empty payload"`

Watch one test file:
- `pnpm --filter @rsentiment/processor exec vitest src/foo.test.ts`

Another package example:
- `pnpm --filter @rsentiment/internal-api exec vitest run src/routes/health.test.ts -t "returns ok"`

When package-level `test` scripts become real, prefer `pnpm --filter <pkg> test` first.

## Local Environment
Start local PostgreSQL:
- `docker compose up -d`

Default DB URL from `.env.example`:
- `postgres://postgres:postgres@localhost:5432/rsentiment`

Suggested bootstrap order:
1. `pnpm install`
2. `docker compose up -d`
3. `pnpm db:migrate`
4. `pnpm db:seed`
5. start one service with `pnpm dev:*`

Ingester source modes:
- `INGESTER_SOURCE=reddit` (default): requires `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT`
- `INGESTER_SOURCE=mock`: local mock feed for development without Reddit credentials
- `mock` mode is a local/dev aid only and does not change the v1 product decision to use official Reddit API in production

## Code Style Rules
No ESLint/Prettier configs are committed yet; follow existing file style and avoid style-only churn.

### Imports
- Use ESM import/export only.
- Use `.js` extension for relative imports in `.ts` files.
- Prefer workspace aliases (`@rsentiment/*`) over cross-package relative imports.
- Group imports consistently: third-party, workspace, relative.
- Remove unused imports in the same change.

### Formatting
- Use 2-space indentation.
- Use semicolons.
- Use double quotes.
- Keep lines readable; avoid unnecessary one-liners.
- Preserve local formatting conventions in touched files.

### Types and validation
- Keep TypeScript strictness intact; do not weaken compiler settings.
- Avoid `any`; prefer `unknown` + narrowing.
- Add explicit return types on exported functions.
- Validate boundary inputs with `zod` (env, API input, Pub/Sub payloads, external API responses).
- Prefer `z.infer<typeof schema>` to keep runtime and static types aligned.
- Keep shared domain types in `packages/contracts`.
- For env validation, parse with service-specific config helpers (`getIngesterEnv`, `getProcessorEnv`, `getInternalApiEnv`).
- Env schemas intentionally allow extra shell/npm vars; validate required keys only.

### Naming
- Functions and variables: `camelCase`
- Types/interfaces/classes: `PascalCase`
- Environment variables: `UPPER_SNAKE_CASE`
- TypeScript files: `kebab-case.ts`
- SQL identifiers: `snake_case`

### Error handling
- Fail fast on invalid startup configuration.
- Never swallow errors silently.
- Log errors with context (service, operation, identifiers).
- Exit non-zero on unrecoverable startup errors.
- In workers, make retry/ack behavior explicit.

### Logging
- Prefer utilities from `@rsentiment/observability`.
- Favor structured logs over free-form text.
- Never log secrets, tokens, or credentials.

### Database and contracts
- Keep query-critical data in columns.
- Do not introduce JSONB-based core logic unless architecture guidance changes.
- Keep metrics append-only where defined.
- Parameterize SQL; no string-built SQL with external/user input.
- Treat `packages/contracts` as the inter-service contract boundary.

## Architecture Guardrails
Locked v1 constraints from `ARCHITECTURE.md`:
- Cloud provider: GCP
- Runtime: Cloud Run services only
- Region: `europe-west2`
- Queue: Pub/Sub
- Database: Cloud SQL (PostgreSQL)
- LLM: Vertex AI (Gemini)
- Ingestion source: Reddit API only (posts + comments)
- Aggregation unit: hourly buckets
- Sentiment labels: `BULLISH | NEUTRAL | BEARISH`

Do not introduce alternate stack components for v1 unless explicitly requested.

## Cursor/Copilot Rules Check
Checked and not found:
- `.cursor/rules/`
- `.cursorrules`
- `.github/copilot-instructions.md`

If these files are added later, follow them and update this guide.

## Agent Change Hygiene
- Keep changes scoped and reversible.
- Update docs/scripts alongside behavior changes.
- Prefer incremental vertical slices that keep workspace buildable.
- Before handoff, run `pnpm typecheck` and `pnpm build`.
- If tests exist for touched areas, run targeted tests first.
