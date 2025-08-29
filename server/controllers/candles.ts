import type { Response, Request } from "express";
import { getAggregatedCandles, getCandlesInRange } from "../lib/candles";
import { pool } from "../db/db";

export const getCandles = async (req: Request, res: Response) => {
  try {
    const asset = (req.query.asset as string) || "BTCUSDC";
    const interval = (req.query.interval as string) || "1m";
    const limit = parseInt((req.query.limit as string) || "100");
    const startTime = req.query.startTime as string | undefined;
    const endTime = req.query.endTime as string | undefined;

    const validAssets = ["BTCUSDC", "ETHUSDC", "SOLUSDC"];
    const validIntervals = ["1m", "5m", "15m", "1h"];

    if (!asset || !validAssets.includes(asset)) {
      return res.status(400).json({ success: false, error: "Invalid asset" });
    }
    if (!interval || !validIntervals.includes(interval)) {
      return res.status(400).json({ success: false, error: "Invalid interval" });
    }

    let rows;
    let source: "materialized_view" = "materialized_view";

    if (startTime && endTime) {
      rows = await getCandlesInRange(asset, interval, new Date(startTime), new Date(endTime));
    } else {
      rows = await getAggregatedCandles(asset, interval, limit);
    }

    const candles = rows.map((c: any) => {
      const t = new Date(c.bucket).getTime() / 1000;
      const d = c.decimals ?? 8;
      return {
        time: Math.floor(t),
        open: c.open / 10 ** d,
        high: c.high / 10 ** d,
        low:  c.low  / 10 ** d,
        close:c.close/ 10 ** d,
      };
    });

    res.status(200).json({
      success: true,
      data: candles.reverse(),
      meta: { asset, interval, count: candles.length, source }
    });
  } catch (err) {
    console.error("getCandles error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch candles" });
  }
};

export const getAssets = async (_req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const r = await client.query(`SELECT DISTINCT asset FROM trade_ticks ORDER BY asset`);
      res.json({ success: true, data: r.rows.map((x: any) => x.asset) });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("assets:", e);
    res.status(500).json({ success: false, error: "Failed to fetch assets" });
  }
};

export const getIntervals = async (_req: Request, res: Response) => {
  res.json({ success: true, data: ["1m", "5m", "15m", "1h"] });
};

export const getStats = async (req: Request, res: Response) => {
  try {
    const asset = (req.query.asset as string) || "BTCUSDC";
    const client = await pool.connect();
    try {
      const q = `
        SELECT '1m' AS interval, COUNT(*) AS candle_count, MIN(bucket) AS earliest_time, MAX(bucket) AS latest_time
        FROM ohlc_1m_view WHERE asset = $1
        UNION ALL
        SELECT '5m', COUNT(*), MIN(bucket), MAX(bucket) FROM ohlc_5m_view WHERE asset = $1
        UNION ALL
        SELECT '15m', COUNT(*), MIN(bucket), MAX(bucket) FROM ohlc_15m_view WHERE asset = $1
        UNION ALL
        SELECT '1h', COUNT(*), MIN(bucket), MAX(bucket) FROM ohlc_1h_view WHERE asset = $1
        ORDER BY 1;
      `;
      const r = await client.query(q, [asset]);
      res.json({ success: true, data: r.rows });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("stats:", e);
    res.status(500).json({ success: false, error: "Failed to fetch statistics" });
  }
};
