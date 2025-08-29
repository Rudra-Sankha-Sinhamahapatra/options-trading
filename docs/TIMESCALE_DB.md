
# TimescaleDB Setup Commands

## Create OHLC Hypertable
```sql
-- Connect to your database
docker exec -it exness psql -U postgres -d exness

DROP TABLE IF EXISTS trade_ticks CASCADE;

CREATE TABLE trade_ticks (
  time        TIMESTAMPTZ NOT NULL,  -- trade timestamp
  asset       VARCHAR(20)  NOT NULL,
  price       BIGINT       NOT NULL, -- scaled integer
  qty         BIGINT       NOT NULL, -- scaled integer
  decimals    INT          NOT NULL
);

SELECT create_hypertable('trade_ticks','time');

-- Retain only 24h
SELECT add_retention_policy('trade_ticks', INTERVAL '24 hours');
 --- 1 m
CREATE MATERIALIZED VIEW ohlc_1m_view
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 minute', time) AS bucket,
  asset,
  first(price, time) AS open,
  max(price)         AS high,
  min(price)         AS low,
  last(price, time)  AS close,
  max(decimals)      AS decimals
FROM trade_ticks
GROUP BY bucket, asset;

SELECT add_continuous_aggregate_policy(
  'ohlc_1m_view',
  start_offset => INTERVAL '2 hours',
  end_offset   => INTERVAL '30 seconds',
  schedule_interval => INTERVAL '15 seconds'
);

-- 5m view
CREATE MATERIALIZED VIEW ohlc_5m_view
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('5 minutes', time) AS bucket,
  asset,
  first(price, time) AS open,
  max(price) AS high,
  min(price) AS low,
  last(price, time) AS close,
  max(decimals) AS decimals
FROM trade_ticks
GROUP BY bucket, asset;

SELECT add_continuous_aggregate_policy('ohlc_5m_view',
    start_offset => INTERVAL '2 hours',
    end_offset   => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes');

SELECT add_retention_policy('ohlc_5m_view', INTERVAL '24 hours');


-- 15m view
CREATE MATERIALIZED VIEW ohlc_15m_view
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('15 minutes', time) AS bucket,
  asset,
  first(price, time) AS open,
  max(price) AS high,
  min(price) AS low,
  last(price, time) AS close,
  max(decimals) AS decimals
FROM trade_ticks
GROUP BY bucket, asset;

SELECT add_continuous_aggregate_policy('ohlc_15m_view',
    start_offset => INTERVAL '3 hours',
    end_offset   => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '15 minutes');

SELECT add_retention_policy('ohlc_15m_view', INTERVAL '24 hours');


-- 1h view
CREATE MATERIALIZED VIEW ohlc_1h_view
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  asset,
  first(price, time) AS open,
  max(price) AS high,
  min(price) AS low,
  last(price, time) AS close,
  max(decimals) AS decimals
FROM trade_ticks
GROUP BY bucket, asset;

SELECT add_continuous_aggregate_policy('ohlc_1h_view',
    start_offset => INTERVAL '1 day',
    end_offset   => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

SELECT add_retention_policy('ohlc_1h_view', INTERVAL '24 hours');


## Troubleshooting

### Force Refresh Materialized Views
```sql
-- If automatic refresh isn't working, force refresh
CALL refresh_continuous_aggregate('ohlc_1m_view', INTERVAL '1 week', NULL);
CALL refresh_continuous_aggregate('ohlc_5m_view', INTERVAL '1 week', NULL);
CALL refresh_continuous_aggregate('ohlc_15m_view', INTERVAL '1 week', NULL);
CALL refresh_continuous_aggregate('ohlc_1h_view', INTERVAL '1 week', NULL);
```
