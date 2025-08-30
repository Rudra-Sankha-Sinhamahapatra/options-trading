import { config } from "@options-trading/backend-common";
import Redis from "ioredis";

const REDIS_URL = config.redis.url || "redis://localhost:6379";

export const redisSub = new Redis(REDIS_URL); 
export const tradeRedisSub = new Redis(REDIS_URL);
export const redisPub = new Redis(REDIS_URL);

redisSub.on("connect", () => {
    console.log("  Redis subscriber connected");
});

redisSub.on("error", (error) => {
    console.error("Redis subscriber error:", error);
});

redisPub.on("connect", () => {
    console.log("  Redis subscriber connected");
});

redisPub.on("error", (error) => {
    console.error("Redis subscriber error:", error);
});

tradeRedisSub.on("connect", () => {
    console.log("  Redis subscriber connected");
});

tradeRedisSub.on("error", (error) => {
    console.error("Redis subscriber error:", error);
});

