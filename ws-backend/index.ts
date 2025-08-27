import { WebSocketServer } from "ws";
import { redisSub } from "./lib/redis";
import { config } from "@options-trading/backend-common";

const PORT = config.ws.port;

const latestBBO: Map<string,string> = new Map();

const wss = new WebSocketServer({ port: Number(PORT)});
console.log(`WS server running at ws://localhost:${PORT}`);


wss.on("connection",(ws) => {
        console.log("New Client connected");
        
        (ws as any).subscribedAssets = new Set<string>();

    for(const [symbol, data] of latestBBO.entries()) {
        if(ws.readyState === ws.OPEN) {
            ws.send(data);
            console.log(`Sent the latest data for ${symbol} to new client`);
        }
    }

    if(ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
            type: "connected",
            message: "Connected to Options Trading WS",
            symbols: Array.from(latestBBO.keys()),
            timestamp: Date.now()
        }))
    }
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            console.log('📨 Received client message:', data);
            
            if (data.type === 'subscribe' && Array.isArray(data.assets)) {
                console.log('📡 Client subscribing to assets:', data.assets);
                data.assets.forEach((asset: string) => {
                    (ws as any).subscribedAssets.add(asset);
                });
                
                for (const asset of data.assets) {
                    const latestData = latestBBO.get(asset);
                    if (latestData && ws.readyState === ws.OPEN) {
                        ws.send(latestData);
                        console.log(`📤 Sent latest ${asset} data to subscriber`);
                    }
                }
            } else if (data.type === 'unsubscribe' && Array.isArray(data.assets)) {
                console.log('📡 Client unsubscribing from assets:', data.assets);
                data.assets.forEach((asset: string) => {
                    (ws as any).subscribedAssets.delete(asset);
                });
            }
        } catch (error) {
            console.error('❌ Error parsing client message:', error);
        }
    });
});

(async()=>{
    console.log("Subscribing to Redis pattern: bbo.*");
    await redisSub.psubscribe("bbo.*");
    console.log("✅ Successfully subscribed to bbo.* pattern");
})();

redisSub.on("psubscribe", (pattern, count) => {
    console.log(`✅ Subscribed to pattern: ${pattern}, total subscriptions: ${count}`);
});

redisSub.on("pmessage",(_pattern,channel,payload) => {
        const symbol = channel.split('.')[1];

    if (symbol) {
        latestBBO.set(symbol, payload);
    }

    for (const client of wss.clients) {
        if(client.readyState === client.OPEN) {
            client.send(payload);
        }
    }
});

setInterval(() => {
    console.log(`🔄 Status - Connected clients: ${wss.clients.size}, Stored symbols: ${latestBBO.size}`);
    if (latestBBO.size > 0) {
        console.log(`📈 Symbols: [${Array.from(latestBBO.keys()).join(', ')}]`);
    }
}, 30000);