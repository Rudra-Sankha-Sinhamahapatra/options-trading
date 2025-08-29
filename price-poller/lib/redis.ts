import { config } from "@options-trading/backend-common";
import Redis from "ioredis";

const REDIS_URL = config.redis.url || "redis://localhost:6379"
const redisPub = new Redis(REDIS_URL);

export async function publish(channel: string, data: unknown) {
    return redisPub.publish(channel,JSON.stringify(data))
}

export async function setValue(channel: string, data: unknown,ttl: number) {
    try {
          await redisPub.set(channel, typeof data === 'string' ? data : JSON.stringify(data),'EX',30);
    } catch (error) {
          console.error(`Redis error for ${channel}:`, error);
    }
}