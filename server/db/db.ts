import { config } from "@options-trading/backend-common"
import { Pool } from "pg"

export const pool = new Pool({
    connectionString: config.dbUrl.timescale.url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Connected to TimescaleDB from server');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err);
});
