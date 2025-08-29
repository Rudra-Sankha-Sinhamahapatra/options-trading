import { pool } from "../db/db";

const VIEW_FOR: Record<string, string> = {
  "1m": "ohlc_1m_view",
  "5m": "ohlc_5m_view",
  "15m": "ohlc_15m_view",
  "1h": "ohlc_1h_view",
} as const;

export async function getLatestCandles(asset: string, interval: string, limit: number = 100) {
  if (!asset || !interval) throw new Error("Asset and interval are required");
  if (!VIEW_FOR[interval]) throw new Error("Invalid interval");
  if (limit > 1000) throw new Error("Limit cannot exceed 1000 candles");

  const client = await pool.connect();
  try {
    const q = `
      SELECT bucket, asset, open, high, low, close, decimals
      FROM ${VIEW_FOR[interval]}
      WHERE asset = $1
      ORDER BY bucket DESC
      LIMIT $2
    `;
    const r = await client.query(q, [asset, limit]);
    return r.rows;
  } finally {
    client.release();
  }
}

export async function getCandlesInRange(
  asset: string,
  interval: string,
  startTime: Date,
  endTime: Date
) {
  if (!asset || !interval) throw new Error("Asset and interval are required");
  if (!VIEW_FOR[interval]) throw new Error("Invalid interval");
  if (startTime >= endTime) throw new Error("Start time must be before end time");

  const days = (endTime.getTime() - startTime.getTime()) / 86400000;
  if (days > 30) throw new Error("Time range cannot exceed 30 days");

  const client = await pool.connect();
  try {
    const q = `
      SELECT bucket, asset, open, high, low, close, decimals
      FROM ${VIEW_FOR[interval]}
      WHERE asset = $1 AND bucket >= $2 AND bucket <= $3
      ORDER BY bucket ASC
    `;
    const r = await client.query(q, [asset, startTime, endTime]);
    return r.rows;
  } finally {
    client.release();
  }
}

export async function getAggregatedCandles(asset: string, interval: string, limit: number = 100) {
  return getLatestCandles(asset, interval, limit);
}
