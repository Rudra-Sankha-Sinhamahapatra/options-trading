import type { Response,Request } from "express";
import { getAggregatedCandles, getCandlesInRange, getLatestCandles } from "../lib/candles";
import { pool } from "../db/db";

export const getCandles = async (req:Request,res:Response) => {
   try {
    const asset = (req.query.asset as string) || 'BTCUSDC';
    const interval = (req.query.interval as string) || '1m';
    const limit = parseInt((req.query.limit as string) || '100');
    const startTime = req.query.startTime as string;
    const endTime = req.query.endTime as string;
    const useAggregate = req.query.useAggregate === 'true';
    
     const validAssets = ['BTCUSDC', 'ETHUSDC', 'SOLUSDC'];

    if (!asset || asset.trim() === '') {
        return res.status(400).json({
            success: false,
            error: 'Invalid asset',
            message: 'Asset parameter is required and cannot be empty'
        });
    }
    
    if (!validAssets.includes(asset)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid asset',
            message: `Asset must be one of: ${validAssets.join(', ')}`,
            provided: asset
        });
    }
    
    // Validation for interval
    const validIntervals = ['1m', '5m', '15m', '1h'];
    if (!interval || !validIntervals.includes(interval)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid interval',
            message: `Interval must be one of: ${validIntervals.join(', ')}`,
            provided: interval
        });
    }

    let candles;
    let source = 'raw_data';

    if(startTime && endTime) {
        candles = await getCandlesInRange(
            asset,
            interval,
            new Date(startTime),
            new Date(endTime)
        );
        source = 'raw_data_range';
    } else if(useAggregate && ['5m', '15m', '1h'].includes(interval)) {
        candles = await getAggregatedCandles(asset,interval,limit);
        source = 'materialized_view';
    } else {
        candles = await getLatestCandles(asset,interval,limit);
        source = 'raw_data'
    }
        const formattedCandles = candles.map(candle => ({
      time: Math.floor(new Date(candle.bucket || candle.time).getTime() / 1000), 
      open: parseFloat(candle.open),
      high: parseFloat(candle.high), 
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
    }));

   res.status(200).json({
      success: true,
      data: formattedCandles.reverse(), 
      meta: {
        asset,
        interval,
        count: formattedCandles.length,
        source,
        ...(startTime && endTime && {
          timeRange: {
            startTime,
            endTime,
            requestedRange: `${startTime} to ${endTime}`
          }
        })
      }
    });

  } catch (error) {
    console.error('❌ Error in getCandles controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch candle data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getAssets = async (req: Request,res:Response) => {
    try {
        const client = await pool.connect();
        
        try {
          const result = await client.query(`
            SELECT DISTINCT asset 
            FROM ohlc_data 
            ORDER BY asset
          `);
          
          res.json({
            success: true,
            data: result.rows.map(row => row.asset)
          });
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('❌ Error fetching assets:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch assets'
        });
      }
    }


    export const getIntervals = async (req: Request,res: Response) => {
          try {
            const client = await pool.connect();
            
            try {
              const result = await client.query(`
                SELECT DISTINCT interval 
                FROM ohlc_data 
                ORDER BY 
                  CASE interval 
                    WHEN '1m' THEN 1
                    WHEN '5m' THEN 2  
                    WHEN '15m' THEN 3
                    WHEN '1h' THEN 4
                    ELSE 5
                  END
              `);
              
              res.json({
                success: true,
                data: result.rows.map(row => row.interval)
              });
            } finally {
              client.release();
            }
          } catch (error) {
            console.error('❌ Error fetching intervals:', error);
            res.status(500).json({
              success: false,
              error: 'Failed to fetch intervals'
            });
          }
        }
    

   export const getStats = async (req:Request, res: Response) => {
      try {
        const client = await pool.connect();
        
        try {
          const result = await client.query(`
            SELECT 
              asset,
              interval,
              COUNT(*) as candle_count,
              MIN(time) as earliest_time,
              MAX(time) as latest_time
            FROM ohlc_data 
            GROUP BY asset, interval 
            ORDER BY asset, interval
          `);
          
          res.json({
            success: true,
            data: result.rows
          });
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch statistics'
        });
      }
   }