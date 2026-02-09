import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

export const sentimentLabelEnum = pgEnum("sentiment_label", ["BULLISH", "NEUTRAL", "BEARISH"]);

export const strategyEnum = pgEnum("strategy", ["OPTIONS", "UNKNOWN"]);

export const optionSideEnum = pgEnum("option_side", ["buy", "sell"]);

export const optionTypeEnum = pgEnum("option_type", ["call", "put"]);

export const subreddits = pgTable(
  "subreddits",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    name: text("name").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex("subreddits_name_unique").on(table.name)]
);

export const posts = pgTable(
  "posts",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    redditId: text("reddit_id").notNull(),
    subredditId: bigint("subreddit_id", { mode: "number" })
      .notNull()
      .references(() => subreddits.id),
    author: text("author").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("posts_reddit_id_unique").on(table.redditId),
    index("posts_subreddit_created_idx").on(table.subredditId, table.createdAt)
  ]
);

export const comments = pgTable(
  "comments",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    redditId: text("reddit_id").notNull(),
    postId: bigint("post_id", { mode: "number" }).references(() => posts.id),
    parentRedditId: text("parent_reddit_id").notNull(),
    subredditId: bigint("subreddit_id", { mode: "number" })
      .notNull()
      .references(() => subreddits.id),
    author: text("author").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    body: text("body").notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("comments_reddit_id_unique").on(table.redditId),
    index("comments_subreddit_created_idx").on(table.subredditId, table.createdAt),
    index("comments_post_id_idx").on(table.postId)
  ]
);

export const metricsSnapshots = pgTable(
  "metrics_snapshots",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    postId: bigint("post_id", { mode: "number" }).references(() => posts.id),
    commentId: bigint("comment_id", { mode: "number" }).references(() => comments.id),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
    score: integer("score").notNull(),
    commentCount: integer("comment_count")
  },
  (table) => [
    index("metrics_snapshots_post_captured_idx").on(table.postId, table.capturedAt),
    index("metrics_snapshots_comment_captured_idx").on(table.commentId, table.capturedAt),
    check(
      "metrics_snapshots_one_parent",
      sql`(
        (${table.postId} is not null and ${table.commentId} is null)
        or
        (${table.postId} is null and ${table.commentId} is not null)
      )`
    )
  ]
);

export const tickers = pgTable(
  "tickers",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    symbol: text("symbol").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex("tickers_symbol_unique").on(table.symbol)]
);

export const postTickerMap = pgTable(
  "post_ticker_map",
  {
    postId: bigint("post_id", { mode: "number" })
      .notNull()
      .references(() => posts.id),
    tickerId: bigint("ticker_id", { mode: "number" })
      .notNull()
      .references(() => tickers.id),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({
      columns: [table.postId, table.tickerId],
      name: "post_ticker_map_pk"
    }),
    index("post_ticker_map_ticker_idx").on(table.tickerId)
  ]
);

export const commentTickerMap = pgTable(
  "comment_ticker_map",
  {
    commentId: bigint("comment_id", { mode: "number" })
      .notNull()
      .references(() => comments.id),
    tickerId: bigint("ticker_id", { mode: "number" })
      .notNull()
      .references(() => tickers.id),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({
      columns: [table.commentId, table.tickerId],
      name: "comment_ticker_map_pk"
    }),
    index("comment_ticker_map_ticker_idx").on(table.tickerId)
  ]
);

export const classifications = pgTable(
  "classifications",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    postId: bigint("post_id", { mode: "number" }).references(() => posts.id),
    commentId: bigint("comment_id", { mode: "number" }).references(() => comments.id),
    sentimentLabel: sentimentLabelEnum("sentiment_label").notNull(),
    sentimentScore: numeric("sentiment_score", { precision: 4, scale: 3 }).notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    strategy: strategyEnum("strategy").notNull().default("UNKNOWN"),
    timeHorizon: text("time_horizon"),
    isOptions: boolean("is_options").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("classifications_post_unique")
      .on(table.postId)
      .where(sql`${table.postId} is not null`),
    uniqueIndex("classifications_comment_unique")
      .on(table.commentId)
      .where(sql`${table.commentId} is not null`),
    index("classifications_strategy_idx").on(table.strategy),
    check(
      "classifications_one_parent",
      sql`(
        (${table.postId} is not null and ${table.commentId} is null)
        or
        (${table.postId} is null and ${table.commentId} is not null)
      )`
    )
  ]
);

export const optionLegs = pgTable(
  "option_legs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    classificationId: bigint("classification_id", { mode: "number" })
      .notNull()
      .references(() => classifications.id),
    side: optionSideEnum("side").notNull(),
    type: optionTypeEnum("type").notNull(),
    strike: numeric("strike", { precision: 12, scale: 4 }),
    expiry: date("expiry"),
    quantity: integer("quantity"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("option_legs_classification_idx").on(table.classificationId)]
);

export const hourlyTickerAggregates = pgTable(
  "hourly_ticker_aggregates",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    tickerId: bigint("ticker_id", { mode: "number" })
      .notNull()
      .references(() => tickers.id),
    hourBucket: timestamp("hour_bucket", { withTimezone: true }).notNull(),
    avgWeightedScore: numeric("avg_weighted_score", { precision: 12, scale: 6 }).notNull(),
    bullishCount: integer("bullish_count").notNull().default(0),
    bearishCount: integer("bearish_count").notNull().default(0),
    neutralCount: integer("neutral_count").notNull().default(0),
    totalMentions: integer("total_mentions").notNull().default(0),
    sentimentLabel: sentimentLabelEnum("sentiment_label").notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("hourly_ticker_aggregates_unique").on(table.tickerId, table.hourBucket),
    index("hourly_ticker_aggregates_hour_idx").on(table.hourBucket)
  ]
);

export const hourlyTickerStrategyAggregates = pgTable(
  "hourly_ticker_strategy_aggregates",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    tickerId: bigint("ticker_id", { mode: "number" })
      .notNull()
      .references(() => tickers.id),
    strategy: strategyEnum("strategy").notNull(),
    hourBucket: timestamp("hour_bucket", { withTimezone: true }).notNull(),
    avgWeightedScore: numeric("avg_weighted_score", { precision: 12, scale: 6 }).notNull(),
    bullishCount: integer("bullish_count").notNull().default(0),
    bearishCount: integer("bearish_count").notNull().default(0),
    neutralCount: integer("neutral_count").notNull().default(0),
    totalMentions: integer("total_mentions").notNull().default(0),
    sentimentLabel: sentimentLabelEnum("sentiment_label").notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("hourly_ticker_strategy_aggregates_unique").on(
      table.tickerId,
      table.strategy,
      table.hourBucket
    ),
    index("hourly_ticker_strategy_hour_idx").on(table.hourBucket)
  ]
);
