import { config } from "@options-trading/backend-common";
import { Pool } from "pg";

export const pool = new Pool({
    connectionString: config.dbUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Connected to TimescaleDB');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err);
});

pool.on('remove', (client) => {
  console.log('🔌 Client removed from pool');
});

export async function closeDatabaseConnection() {
 try {
    await pool.end();
    console.log('✅ Database connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

export async function testConnection() {
  let retries = 3;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Database connection test successful');
      return true;
    } catch (error) {
      retries--;
      console.error(`❌ Database connection test failed. Retries left: ${retries}`);
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  throw new Error('Database connection failed after all retries');
}

testConnection().catch(error => {
  console.error('❌ Failed to establish database connection:', error);
  process.exit(1);
});