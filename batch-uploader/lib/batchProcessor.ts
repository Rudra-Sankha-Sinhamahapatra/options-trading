import { pool } from "./db";

interface OHLCData {
    asset: string,
    interval: string,
    openTime: number;
    closeTime: number;
    open: string;
    high: string;
    low: string;
    close: string
}

export async function batchInsertOHLC(ohlcBatch: OHLCData[]) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const values: any[] = [];
        const placeholder: string[] = [];

        ohlcBatch.forEach((ohlc, index) => {
            const baseIndex = index * 9;
            placeholder.push(
                `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9})`
            );

            values.push(
                new Date(ohlc.openTime),  // time
                ohlc.asset,               // asset
                ohlc.interval,            // interval
                parseFloat(ohlc.open),    // open
                parseFloat(ohlc.high),    // high
                parseFloat(ohlc.low),     // low
                parseFloat(ohlc.close),   // close
                ohlc.openTime,            // open_time
                ohlc.closeTime            // close_time
            );
        });

        const insertQuery = `
    INSERT INTO ohlc_data (time, asset, interval, open, high, low, close, open_time, close_time)
    VALUES ${placeholder.join(', ')}`;

        const result = await client.query(insertQuery, values);

        await client.query('COMMIT');

        console.log(`✅ Batch inserted ${result.rowCount} OHLC records to TimescaleDB`);

        return result.rowCount;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Error in batch insert:", error);
        throw error;
    } finally {
        client.release();
    }
}

export async function getLatestCandles(asset: string, interval: string, limit: number = 100) {
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
        close_time,
        created_at
      FROM ohlc_data 
      WHERE asset = $1 AND interval = $2
      ORDER BY time DESC 
      LIMIT $3
    `;

        const result = await client.query(query, [asset, interval, limit]);
        return result.rows;
    } catch (error) {
        console.error("❌ Error fetching candles:", error);
        throw error;
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


export async function getOHLCStats() {
    const client = await pool.connect();

    try {
        const query = `
      SELECT 
        asset,
        interval,
        COUNT(*) as total_candles,
        MIN(time) as earliest_candle,
        MAX(time) as latest_candle
      FROM ohlc_data 
      GROUP BY asset, interval
      ORDER BY asset, interval
    `;

        const result = await client.query(query);
        return result.rows;
    } catch (error) {
        console.error("❌ Error fetching OHLC stats:", error);
        throw error;
    } finally {
        client.release();
    }
}