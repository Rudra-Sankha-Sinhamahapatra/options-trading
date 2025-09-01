import { consumer, TOPICS } from "@options-trading/backend-common"
import { batchInsertTicks, type TickRow } from "./lib/batchProcessor"
import { closeDatabaseConnection } from "./lib/db"

const BATCH: TickRow[] = []
const BATCH_SIZE = 50
const BATCH_TIMEOUT_MS = 5000
let timer: NodeJS.Timeout | null = null

function scheduleFlush() {
  if (timer) return
  timer = setTimeout(async () => {
    try {
      if (BATCH.length) {
        const copy = BATCH.splice(0, BATCH.length)
        await batchInsertTicks(copy)
      }
    } finally {
      timer = null
    }
  }, BATCH_TIMEOUT_MS)
}

await consumer.connect()
await consumer.subscribe({ topics: [TOPICS.OHLC_DATA] })

await consumer.run({
  eachMessage: async ({ message }) => {
    if (!message.value) return
    const p = JSON.parse(message.value.toString())

    const isTick = p?.kind === "tick" || p?.interval === "tick"
    if (!isTick) return

    const row: TickRow = {
      time: new Date(p.ts ?? p.closeTime),         
      asset: p.symbol ?? p.asset,
      price: p.price ?? p.close,                  
      qty: p.qty ?? 0,                           
      decimals: p.decimals
    }

    BATCH.push(row)

    if (BATCH.length >= BATCH_SIZE) {
      const copy = BATCH.splice(0, BATCH.length)
      await batchInsertTicks(copy)
      return
    }

    scheduleFlush()
  }
})

process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing DB connection...');
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing DB connection...');
  await closeDatabaseConnection();
  process.exit(0);
});
