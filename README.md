# options-trading
Options Trading Platform 

# TimescaleDB Setup Commands

## Create OHLC Hypertable
```sql
-- Connect to your database
docker exec -it exness psql -U postgres -d exness

-- Create OHLC table
CREATE TABLE IF NOT EXISTS ohlc_data (
    time TIMESTAMPTZ NOT NULL,
    asset VARCHAR(20) NOT NULL,
    interval VARCHAR(5) NOT NULL,
    open DECIMAL(20,8) NOT NULL,
    high DECIMAL(20,8) NOT NULL,
    low DECIMAL(20,8) NOT NULL,
    close DECIMAL(20,8) NOT NULL,
    open_time BIGINT NOT NULL,
    close_time BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('ohlc_data', 'time');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ohlc_asset_interval_time ON ohlc_data (asset, interval, time DESC);
CREATE INDEX IF NOT EXISTS idx_ohlc_time ON ohlc_data (time DESC);

-- Set retention policy to keep data for 30 days
SELECT add_retention_policy('ohlc_data', INTERVAL '30 days');

-- Check current retention policies
SELECT * FROM timescaledb_information.jobs 
WHERE job_type = 'retention';

```

## Query Commands
```sql
-- Check data count
SELECT COUNT(*) FROM ohlc_data;

-- Get latest candles for BTCUSDC 1m
SELECT * FROM ohlc_data 
WHERE asset = 'BTCUSDC' AND interval = '1m' 
ORDER BY time DESC LIMIT 10;

-- Get candles in time range
SELECT * FROM ohlc_data 
WHERE asset = 'BTCUSDC' 
  AND interval = '1m' 
  AND time >= '2024-08-26 00:00:00' 
  AND time <= '2024-08-26 23:59:59'
ORDER BY time ASC;
```


# TimescaleDB Materialized Views Setup

## Create Continuous Aggregates
```sql
-- Connect to your database
docker exec -it exness psql -U postgres -d exness

-- 1m aggregates (for better indexing)
CREATE MATERIALIZED VIEW ohlc_1m_view
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 minute', time) AS bucket,
    asset,
    first(open, time) AS first_open,
    max(high) AS max_high,
    min(low) AS min_low,
    last(close, time) AS last_close,
    count(*) AS candle_count
FROM ohlc_data
WHERE interval = '1m'
GROUP BY bucket, asset;

-- 5m aggregates
CREATE MATERIALIZED VIEW ohlc_5m_view
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', time) AS bucket,
    asset,
    first(open, time) AS first_open,
    max(high) AS max_high,
    min(low) AS min_low,
    last(close, time) AS last_close,
    count(*) AS candle_count
FROM ohlc_data
WHERE interval = '1m'
GROUP BY bucket, asset;

-- 15m aggregates
CREATE MATERIALIZED VIEW ohlc_15m_view
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('15 minutes', time) AS bucket,
    asset,
    first(open, time) AS first_open,
    max(high) AS max_high,
    min(low) AS min_low,
    last(close, time) AS last_close,
    count(*) AS candle_count
FROM ohlc_data
WHERE interval = '1m'
GROUP BY bucket, asset;

-- 1h aggregates
CREATE MATERIALIZED VIEW ohlc_1h_view
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS bucket,
    asset,
    first(open, time) AS first_open,
    max(high) AS max_high,
    min(low) AS min_low,
    last(close, time) AS last_close,
    count(*) AS candle_count
FROM ohlc_data
WHERE interval = '1m'
GROUP BY bucket, asset;

-- Add refresh policies
SELECT add_continuous_aggregate_policy('ohlc_1m_view',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');

SELECT add_continuous_aggregate_policy('ohlc_5m_view',
    start_offset => INTERVAL '1 hour', 
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes');

SELECT add_continuous_aggregate_policy('ohlc_15m_view',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '15 minutes', 
    schedule_interval => INTERVAL '15 minutes');

SELECT add_continuous_aggregate_policy('ohlc_1h_view',
    start_offset => INTERVAL '6 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

## Verify Materialized Views
```sql
-- Check if views were created
SELECT * FROM timescaledb_information.continuous_aggregates;

-- Check data in views (after some time)
SELECT COUNT(*) FROM ohlc_5m_view;
SELECT * FROM ohlc_5m_view WHERE asset = 'BTCUSDC' ORDER BY bucket DESC LIMIT 5;
```