# Trading Sentiment Backend – Architecture

This document defines the **initial backend architecture** for a Reddit-driven stock/options sentiment system. It intentionally focuses on **signal quality, cost control, and schema stability**, with no frontend concerns.

---

## Goals

* Ingest Reddit posts and comments from a growing list of subreddits
* Classify sentiment (bullish / neutral / bearish) and trading strategy
* Aggregate sentiment in near–real time
* Keep infrastructure **cheap**, **simple**, and **scalable**
* Avoid schema rewrites or large migrations later

---

## Non‑Goals (v1)

* No trading advice or execution
* No user accounts or auth
* No alerts or backtesting
* No long-term historical analytics

---

## Technology Choices (Locked)

* **Cloud provider:** Google Cloud Platform (single project)
* **Region:** `europe-west2` (London)
* **Infrastructure as Code:** Terraform
* **Runtime:** Cloud Run only
* **Language:** TypeScript
* **Queue:** Pub/Sub
* **Database:** Cloud SQL (PostgreSQL)
* **LLM:** Vertex AI (Gemini)
* **Secrets:** GitHub Secrets (preferred), injected as env vars into Cloud Run

---

## Data Sources

### Reddit

* Official Reddit API only
* OAuth + rate limits respected
* Scope:

  * Posts **and** comments
* Backfill:

  * Last **3 days** on initial run
* Ongoing ingestion:

  * Forward-only

Subreddits are **config-driven** and stored in the database. Adding a new subreddit does not require redeploying services.

---

## High-Level Architecture

```
Reddit API
   ↓
Cloud Run – Reddit Ingester
   ↓
Pub/Sub (raw-posts)
   ↓
Cloud Run – Processor
   ↓
PostgreSQL (Cloud SQL)
   ↓
Cloud Run – Internal API
```

---

## Ingestion Model

### Immutable vs Mutable Data

* **Immutable (write once):**

  * Post / comment text
  * Author
  * Created timestamp

* **Mutable (time-varying):**

  * Scores / upvotes
  * Comment counts

These are stored separately.

### Metrics Snapshots

Instead of updating rows, engagement data is **snapshotted**:

* New rows are appended over time
* Latest snapshot = current value
* Old posts stop refreshing after they become inactive

---

## Database Design Principles

* Everything that is queried or aggregated lives in **columns**
* No JSONB for core logic
* AI output must conform to the schema
* Old data can be dropped or archived cheaply

---

## Core Tables (Simplified)

### Subreddits

* name
* enabled
* last_crawled_at

### Posts / Comments

* reddit_id
* subreddit_id
* parent_id (for comments)
* author
* created_at
* title / body

### Metrics (append-only)

* post_id / comment_id
* captured_at
* score
* comment_count

### Tickers

* symbol

### Post ↔ Ticker Mapping

* post_id
* ticker_id
* confidence

### Classifications

* post_id
* sentiment_label
* sentiment_score
* confidence
* strategy
* time_horizon
* is_options

### Option Legs (when applicable)

* post_id
* side (buy / sell)
* type (call / put)
* strike
* expiry
* quantity (optional)

---

## Granularity (Locked)

### Base Layer

* **Per post / comment**
* Classified once, immutable

### Aggregation Layer

* **Ticker × hour**
* **Ticker × strategy × hour**

No subreddit-level aggregation in v1.

---

## Time Windows (Derived Only)

Stored aggregation unit: **hourly buckets**

All windows are computed from hourly data:

* 1 hour
* 6 hours
* 24 hours
* 7 days

No redundant window tables are stored.

---

## Sentiment Model (Locked)

### Atomic Sentiment (per post/comment)

Each item produces:

* **Label:** `BULLISH | NEUTRAL | BEARISH`
* **Numeric score:** `-1.0 → +1.0`
* **Confidence:** `0.0 → 1.0`

Stored explicitly as columns.

---

### Weighting Formula

Each item contributes:

```
weighted_score =
  sentiment_score
  × confidence
  × log(reddit_score + 1)
```

This:

* Rewards engagement
* Dampens viral dominance
* Reduces low-confidence noise

---

### Hourly Aggregation Outputs

For each `(ticker, hour)` bucket:

* avg_weighted_score
* bullish_count
* bearish_count
* neutral_count
* total_mentions
* strategy_breakdown

**Label derivation:**

* avg_weighted_score > +0.15 → Bullish
* avg_weighted_score < -0.15 → Bearish
* Otherwise → Neutral

Thresholds are tunable without schema changes.

---

## Core Queries (v1)

* Trending tickers
* Sentiment over time (ticker)
* Bullish vs bearish sentiment
* Options-only sentiment
* Strategy breakdown
* High-engagement posts driving sentiment

---

## API Usage

* Internal API only
* No external consumers (v1)
* No auth complexity initially

---

## Cost-Control Strategies

* Reddit-only ingestion
* Hourly aggregation (no minute-level buckets)
* Stop refreshing old posts
* No BigQuery initially
* Cloud Run scale-to-zero

---

## Future Extensions (Not v1)

* Alerts
* Backtesting
* BigQuery analytics
* More data sources
* User accounts

---

## Design Summary

This architecture prioritizes:

* **Actionable signal over historical hoarding**
* **Relational correctness over flexible blobs**
* **Low cost over premature scale**

It is designed to evolve without requiring rewrites or migrations.

