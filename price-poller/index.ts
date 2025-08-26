import { startBinanceBboPoller } from "./lib/binance";

const SYMBOLS = ["BTCUSDC", "ETHUSDC", "SOLUSDC"];

startBinanceBboPoller(SYMBOLS);
