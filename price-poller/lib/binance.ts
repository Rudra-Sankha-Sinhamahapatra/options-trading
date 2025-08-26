import WebSocket from "ws"
import { publish } from "./redis"
import { sendOHLCToKafka } from "./sendToKafka";


export function startBinanceBboPoller(symbols: string[], intervals: string[]) {
  const bboStreams = symbols.map(symbol => `${symbol.toLowerCase()}@bookTicker`);
  const bboWsUrl = `wss://stream.binance.com:9443/ws/${bboStreams.join('/')}`;

  const klineStreams = symbols.flatMap(symbol => 
    intervals.map(interval => `${symbol.toLowerCase()}@kline_${interval}`)
  );
  const klineWsUrl = `wss://stream.binance.com:9443/ws/${klineStreams.join('/')}`;

  console.log(`🎯 Tracking symbols: [${symbols.join(', ')}]`);
  console.log(`⏱️ Tracking intervals: [${intervals.join(', ')}]`);


  const bboWs = new WebSocket(bboWsUrl);

  bboWs.on('open', () => {
    console.log('✅ Connected to Binance BBO WebSocket');
  });

  bboWs.on('message', async(data) => {
    try {
      const message = JSON.parse(data.toString());
      if(message.u && message.s) {
        const bboData = `bbo ${message.s} ${Date.now()} ${message.b} ${message.B} ${message.a} ${message.A}`;
        await publish(`bbo.${message.s}`, bboData);
      }
    } catch (error) {
      console.error('❌ Error processing BBO data:', error);
    }
  });

  const klineWs = new WebSocket(klineWsUrl);

  klineWs.on('open', ()=> {
    console.log("✅ Connected to Binance OHLC WebSocket");
  });

  klineWs.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      if(message.k) {
        const kline = message.k;

        if(kline.x) { 
          const ohlcData = {
            asset: kline.s,
            interval: kline.i,
            openTime: kline.t,
            closeTime: kline.T,
            open: kline.o,
            high: kline.h,
            low: kline.l,
            close: kline.c
          };

          console.log(`🕯️ OHLC ${ohlcData.asset} ${ohlcData.interval}: O:${ohlcData.open} H:${ohlcData.high} L:${ohlcData.low} C:${ohlcData.close}`);
          
          await sendOHLCToKafka(ohlcData);
        }
      }
    } catch (error) {
      console.error('❌ Error processing OHLC data:', error);
    }
  });

  bboWs.on('error', (error) => console.error('❌ BBO WebSocket error:', error));
  klineWs.on('error', (error) => console.error('❌ OHLC WebSocket error:', error));

  bboWs.on('close', () => {
    console.log('🔄 BBO WebSocket closed, reconnecting in 5s...');
    setTimeout(() => startBinanceBboPoller(symbols, intervals), 5000);
  });

  klineWs.on('close', () => {
    console.log('🔄 OHLC WebSocket closed, reconnecting in 5s...');
    setTimeout(() => startBinanceBboPoller(symbols, intervals), 5000);
  });
}