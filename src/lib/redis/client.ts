import Redis from "ioredis";

import { env } from "@/env";

const globalForRedis = globalThis as typeof globalThis & {
  __nhamRedis?: Redis | null;
  __nhamRedisReady?: Promise<Redis | null>;
};

function createRedisClient(redisUrl: string) {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });
}

/** Shared Redis client. Returns null when REDIS_URL is unset or connect fails. */
export async function getRedis(): Promise<Redis | null> {
  if (globalForRedis.__nhamRedis !== undefined) {
    return globalForRedis.__nhamRedis;
  }

  if (!globalForRedis.__nhamRedisReady) {
    globalForRedis.__nhamRedisReady = (async () => {
      const redisUrl = env.REDIS_URL?.trim();

      if (!redisUrl) {
        globalForRedis.__nhamRedis = null;
        return null;
      }

      const client = createRedisClient(redisUrl);

      try {
        await client.connect();
        globalForRedis.__nhamRedis = client;
        return client;
      } catch {
        // ponytail: Redis optional — callers fall back to in-memory.
        globalForRedis.__nhamRedis = null;
        return null;
      }
    })();
  }

  return globalForRedis.__nhamRedisReady;
}
