import { asc } from "drizzle-orm";
import { db } from "../client.js";
import { tickers } from "../schema.js";

export async function getTrendingTickers(limit = 10): Promise<Array<{ symbol: string }>> {
  const rows = await db
    .select({ symbol: tickers.symbol })
    .from(tickers)
    .orderBy(asc(tickers.symbol))
    .limit(limit);

  return rows;
}
