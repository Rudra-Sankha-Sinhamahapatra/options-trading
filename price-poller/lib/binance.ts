import WebSocket from "ws"
import { publish } from "./redis"

export type BookTicker = {
  s: string; // symbol
  b: string; // best bid price
  B: string; // bid qty
  a: string; // best ask price
  A: string; // ask qty
  u?: number;
};

export function startBinanceBboPoller(symbols: string[]) {
    const streams = symbols.map(s => `${s.toLocaleLowerCase()}@bookTicker`).join("/");
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    let ws: WebSocket | null = null;
    let keep: NodeJS.Timer | null = null;

    const connect = () => {
        ws = new WebSocket(url);

        ws.on("open",() => {
        console.log("Binance connected:", symbols.join(", "));
        keep = setInterval(() => {
        if(ws?.readyState === ws?.OPEN) ws?.ping();
        },30_000)
        });

        ws.on("message", (raw) => {
            try {
            const j = JSON.parse(raw.toString());
            const d: BookTicker = j.data ?? j;
            if(!d?.s) return;

            console.log(
                  "bbo",
              d.s,
               Date.now(),
             d.b,
                d.B,
               d.a,
             d.A
            )
            publish(`bbo.${d.s}`, {
                type: "bbo",
                symbol: d.s,
                ts: Date.now(),
                bestBid: d.b,
                bidQty: d.B,
                bestAsk: d.a,
                askQty: d.A
            })
            } catch {}
        });
            ws.on("close", () => {
      console.log("❌ Binance disconnected, retrying...");
      if (keep) clearInterval(keep);
      setTimeout(connect, 2000);
    });

    ws.on("error", (e) => {
      console.error("ws error:", e);
      ws?.close();
    });
    };
    connect();
}