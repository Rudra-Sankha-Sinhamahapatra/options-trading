import { config } from "@options-trading/backend-common";
import { Pool } from "pg";

export const pool = new Pool({
    connectionString: config.dbUrl.timescale.url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('  Connected to TimescaleDB');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

pool.on('remove', (client) => {
  console.log('🔌 Client removed from pool');
});

export async function closeDatabaseConnection() {
 try {
    await pool.end();
    console.log('  Database connection closed gracefully');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

export async function setupRetentionPolicy() {
    try {
        const extensionCheck = await pool.query(`
            SELECT * FROM pg_extension WHERE extname = 'timescaledb';
        `);
        
        if (extensionCheck.rows.length === 0) {
            console.log('TimescaleDB extension not found, enabling it...');
            await pool.query('CREATE EXTENSION IF NOT EXISTS timescaledb;');
            console.log('  TimescaleDB extension enabled');
        }

        let checkQuery;
        try {
            checkQuery = `
                SELECT * FROM timescaledb_information.jobs 
                WHERE job_type = 'retention' 
                AND hypertable_name = 'ohlc_data';
            `;
            const result = await pool.query(checkQuery);
            
            if (result.rows.length === 0) {
                await pool.query(`
                    SELECT add_retention_policy('ohlc_data', INTERVAL '30 days');
                `);
                console.log('  Added 30-day retention policy to ohlc_data');
            } else {
                console.log('Retention policy already exists for ohlc_data');
            }
        } catch (jobsError) {
            console.log('Using fallback method for retention policy');
            try {
                await pool.query(`
                    SELECT add_retention_policy('ohlc_data', INTERVAL '30 days');
                `);
                console.log('Added 30-day retention policy to ohlc_data (fallback method)');
            } catch (addError:any) {
                if (addError.message.includes('already exists') || addError.message.includes('already has')) {
                    console.log('Retention policy already exists for ohlc_data');
                } else {
                    throw addError;
                }
            }
        }
    } catch (error:any) {
        console.error('Error setting up retention policy:', error.message);
    }
}

export async function testConnection() {
  let retries = 3;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('  Database connection test successful');
      return true;
    } catch (error) {
      retries--;
      console.error(`Database connection test failed. Retries left: ${retries}`);
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  throw new Error('Database connection failed after all retries');
}

testConnection().catch(error => {
  console.error('Failed to establish database connection:', error);
  process.exit(1);
});