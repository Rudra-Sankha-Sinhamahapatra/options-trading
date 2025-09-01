import { disconnectKafkaProducer, initKafkaProducer } from "@options-trading/backend-common";
import { startBinanceTradePoller } from "./lib/binance";

const SYMBOLS = ["BTCUSDC", "ETHUSDC", "SOLUSDC"];

(async () => {  
    try {
        console.log("Starting Price Poller Service");
        
        await initKafkaProducer();
        console.log("Kafka producer initialized");
        
        startBinanceTradePoller(SYMBOLS);
        
    } catch (error) {
        console.error("Error starting price poller:", error);
        process.exit(1);
    }
})();

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await disconnectKafkaProducer();
  process.exit(0);
});
