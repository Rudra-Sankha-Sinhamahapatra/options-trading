import { disconnectKafkaProducer, initKafkaProducer } from "@options-trading/backend-common";
import { startBinanceBboPoller } from "./lib/binance";

const SYMBOLS = ["BTCUSDC", "ETHUSDC", "SOLUSDC"];
const INTERVALS = ['1m', '5m', '15m', '1h'];

(async () => {  
    try {
        console.log("🚀 Starting Price Poller Service");
        
        await initKafkaProducer();
        console.log("✅ Kafka producer initialized");
        
        startBinanceBboPoller(SYMBOLS, INTERVALS);
        
    } catch (error) {
        console.error("❌ Error starting price poller:", error);
        process.exit(1);
    }
})();

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down...');
  await disconnectKafkaProducer();
  process.exit(0);
});
