import { config } from "@options-trading/backend-common";
import Redis from "ioredis";

const REDIS_URL = config.redis.url || "redis://localhost:6379";

export const redisSub = new Redis(REDIS_URL); 

redisSub.on("connect", () => {
    console.log("  Redis subscriber connected");
});

redisSub.on("error", (error) => {
    console.error("Redis subscriber error:", error);
});
