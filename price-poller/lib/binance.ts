import WebSocket from "ws"
import { publish, setValue } from "./redis"
import { sendOHLCToKafka } from "./sendToKafka";


function detectDecimals(priceStr: string) : number {
  if (!priceStr.includes(".")) return 0;
  return priceStr.split(".")[1]!.length
}

export function startBinanceTradePoller(symbols: string[]) {
 const tradeStreams = symbols.map(symbol => `${symbol.toLocaleLowerCase()}@trade`);
 const tradeWsUrl = `wss://stream.binance.com:9443/stream?streams=${tradeStreams.join('/')}`;

 console.log(`Tracking trade streams: [${symbols.join(', ')}]`);
 const tradeWs = new WebSocket(tradeWsUrl);

  tradeWs.on('open', () => {
    console.log("Connected to Biance Trade Websocket");
  })

  tradeWs.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      const trade = msg.data;

      if(trade?.p && trade?.s) {
        const tradeData = {
          symbol: trade.s,
          price: parseFloat(trade.p),
          qty: parseFloat(trade.q),
          tradeId: trade.t,
          timestamp: trade.T,
          isBuyerMarket: trade.m
        }

        const decimals = detectDecimals(trade.p);
        const scaledPrice = Math.round(tradeData.price * 10 ** decimals);
       
        const SPREAD_TOTAL = 0.01 //1 %
        const half = SPREAD_TOTAL / 2; //0.5%  on each side

        const buyPrice = Math.round(scaledPrice * (1 + half));
        const sellPrice = Math.round(scaledPrice * (1 - half));

        const priceUpdate = {
          symbol: tradeData.symbol,
          price: scaledPrice,
          buyPrice,
          sellPrice,
          decimals,
          timestamp: tradeData.timestamp
        }

        await publish(`bbo.${tradeData.symbol}`, priceUpdate)
        await setValue(`price:${tradeData.symbol}`, priceUpdate, 30)

        await sendOHLCToKafka({
          kind:'tick',
          asset: tradeData.symbol,
          interval: "tick", 
          openTime: tradeData.timestamp,
          closeTime: tradeData.timestamp,
          open: scaledPrice,
          high: scaledPrice,
          low: scaledPrice,
          close: scaledPrice,
          decimals
        })

        console.log(`Trade ${tradeData.symbol}: ${tradeData.price} qty:${tradeData.qty}`)
      }
    } catch (err) {
      console.error("Error processing trade data:", err)
    }

  })

  tradeWs.on("error", (err) => console.error("Trade WS error:", err))
  tradeWs.on("close", () => {
    console.log("Trade WS closed, reconnecting in 5s...")
    setTimeout(() => startBinanceTradePoller(symbols), 5000)
  })
}