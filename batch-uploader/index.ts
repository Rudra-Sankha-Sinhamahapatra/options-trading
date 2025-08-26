import { consumer, TOPICS } from "@options-trading/backend-common";
import { batchInsertOHLC, getOHLCStats } from "./lib/batchProcessor";
import { closeDatabaseConnection } from "./lib/db";

const BATCH_SIZE = 100;
const BATCH_TIMEOUT = 5000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; 

let batch: any[] = [];
let batchTimer: Timer | null = null;

console.log("🚀 Starting Batch Uploader Service (Raw SQL)");

await consumer.connect();
await consumer.subscribe({ topics: [TOPICS.OHLC_DATA] });

console.log(`✅ Connected to Kafka, consuming from topic: ${TOPICS.OHLC_DATA}`);


async function retryWithBackoff<T>(
fn: () => Promise<T>,
maxRetries: number = MAX_RETRIES,
baseDelay: number = RETRY_DELAY
): Promise<T> {
   let lastError: Error;

   for (let attempt = 1; attempt <= maxRetries; attempt ++) {
    try {
        return await fn();
    } catch (error) {
        lastError = error as Error;

        if(attempt === maxRetries) {
            throw lastError;
        }
        const delay = baseDelay * Math.pow(2,attempt - 1);
         console.log(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`);
            console.log(`   Error: ${lastError.message}`);

            await new Promise(resolve => setTimeout(resolve, delay));
    }
   }
   throw lastError!;
}

async function processBatch() {
    if (batch.length === 0) return;

    console.log(`Processing batch of ${batch.length} OHLC records`);

    try {
        const insertedCount = await batchInsertOHLC([...batch]);
        console.log(`✅ Successfully inserted ${insertedCount} records into TimescaleDB`);
        batch = [];
    } catch (error) {
        console.error("❌ Error processing batch:", error);
       
    }
    batchTimer = null;
}

await consumer.run({
    eachMessage: async({ topic, partition, message }) => {
        console.log(`🔍 DEBUG: Received message from topic: ${topic}`);
        console.log(`🔍 DEBUG: Message key: ${message.key?.toString()}`);
        console.log(`🔍 DEBUG: Message value: ${message.value?.toString()}`);
        
        try {
            const ohlcData = JSON.parse(message.value?.toString() || '{}');

            console.log(`📨 Parsed OHLC: ${JSON.stringify(ohlcData)}`);

            batch.push(ohlcData);
            console.log(`📦 Current batch size: ${batch.length}/${BATCH_SIZE}`);

            if(batch.length >= BATCH_SIZE) {
                console.log(`🚀 Batch size reached, processing...`);
                if(batchTimer) {
                    clearTimeout(batchTimer);
                    batchTimer = null;
                }
                await processBatch();
            }
            else if(!batchTimer) {
                console.log(`⏰ Setting batch timer for ${BATCH_TIMEOUT}ms`);
                batchTimer = setTimeout(processBatch, BATCH_TIMEOUT);
            }
        } catch (error) {
            console.error("❌ Error processing message:", error);
            console.error("❌ Raw message:", message.value?.toString());
        }
    }
});

setInterval(async() => {
    try {
        const stats = await retryWithBackoff(async () => {
         return await getOHLCStats();
        },2,500)
        console.log("OHLC Data Statistics: ");
          stats.forEach(stat => {
      console.log(`   ${stat.asset} ${stat.interval}: ${stat.total_candles} candles (${stat.earliest_candle} to ${stat.latest_candle})`);
    });

    } catch (error) {
          console.error("❌ Error fetching stats:", error);
    }
}, 30000);

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down batch uploader...');

  if (batch.length > 0) {
    console.log(`📦 Processing final batch of ${batch.length} records`);
    await processBatch();
  }
  
  await consumer.disconnect();
  await closeDatabaseConnection();
  process.exit(0);
});

