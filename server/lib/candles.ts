import { pool } from "../db/db";

export async function getLatestCandles(asset: string, interval: string, limit: number = 100) {
    if (!asset || !interval) {
        throw new Error('Asset and interval are required');
    }

    if (limit > 1000) {
        throw new Error('Limit cannot exceed 1000 candles');
    }
    const client = await pool.connect();

    try {
        const query = `
        SELECT
            time,
            asset,
            interval,
            open,
            high,
            low,
            close,
            open_time,
            close_time
        FROM ohlc_data 
        WHERE asset = $1 AND interval = $2
        ORDER BY time DESC 
        LIMIT $3
        `;

        const result = await client.query(query, [asset, interval, limit]);

        if (result.rows.length === 0) {
            console.warn(`⚠️ No candles found for ${asset} ${interval}`);
        }

        return result.rows;

    } catch (error) {
        console.error("❌ Error fetching candles:", error);
        throw error;
    } finally {
        client.release()
    }
}

export async function getCandlesInRange(
    asset: string,
    interval: string,
    startTime: Date,
    endTime: Date
) {

    if (!asset || !interval) {
        throw new Error('Asset and interval are required');
    }

    if (startTime >= endTime) {
        throw new Error('Start time must be before end time');
    }


    const daysDiff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) {
        throw new Error('Time range cannot exceed 30 days');
    }
    const client = await pool.connect();

    try {
        const query = `
        SELECT 
            time,
            asset,
            interval,
            open,
            high,
            low,
            close,
            open_time,
            close_time
        FROM ohlc_data 
        WHERE asset = $1 
            AND interval = $2 
            AND time >= $3 
            AND time <= $4
        ORDER BY time ASC
        `;

        const result = await client.query(query, [asset, interval, startTime, endTime]);
        return result.rows;

    } catch (error) {
        console.error("❌ Error fetching candles in range:", error);
        throw error;
    } finally {
        client.release();
    }
}

export async function getAggregatedCandles(asset: string, interval: string, limit: number = 100) {
      if (!asset || !['1m','5m', '15m', '1h'].includes(interval)) {
    throw new Error('Invalid asset or interval for aggregated candles');
  }

  if (limit > 1000) {
    throw new Error('Limit cannot exceed 1000 candles');
  }

    const client = await pool.connect();

    try {
        const viewName = `ohlc_${interval}_view`;
        const query = `
        SELECT
            bucket,
            asset,
            first_open as open,
            max_high as high,
            min_low as low,
            last_close as close
        FROM ${viewName}
        WHERE asset = $1
        ORDER BY bucket DESC 
        LIMIT $2
        `;

        const result = await client.query(query, [asset, limit]);
        return result.rows;

    } catch (error) {
        console.error("❌ Error fetching aggregated candles:", error);
        return await getLatestCandles(asset, interval, limit);
    } finally {
        client.release();
    }
}
