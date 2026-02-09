import { dbPool } from "../client.js";

export async function getTrendingTickers(limit = 10): Promise<Array<{ symbol: string }>> {
  const result = await dbPool.query<{ symbol: string }>(
    "select symbol from tickers order by symbol asc limit $1",
    [limit]
  );
  return result.rows;
}
