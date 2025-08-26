import { config } from "@options-trading/backend-common";
import Redis from "ioredis";

const REDIS_URL = config.redis.url || "redis://localhost:6379"
const redisPub = new Redis(REDIS_URL);

export async function publish(channel: string, data: unknown) {
    return redisPub.publish(channel,JSON.stringify(data))
}