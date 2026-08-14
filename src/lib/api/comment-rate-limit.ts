import { getClientIpAddress, type RequestLike } from "@/lib/auth/request-ip";
import { getRedis } from "@/lib/redis/client";

const WINDOW_SEC = 60;
const MAX_ATTEMPTS = 5;

type RateLimitHit = {
  retryAfterSeconds: number;
};

const globalMemory = globalThis as typeof globalThis & {
  __nhamCommentRateLimitMemory?: Map<string, { count: number; windowStartedAt: number }>;
};

function memoryStore() {
  if (!globalMemory.__nhamCommentRateLimitMemory) {
    globalMemory.__nhamCommentRateLimitMemory = new Map();
  }

  return globalMemory.__nhamCommentRateLimitMemory;
}

function bucketKey(userId: string, ip: string) {
  return `${userId}:${ip}`;
}

/** Returns a hit object when the user/IP pair is over the comment cap; otherwise null. */
export async function assertCommentRateLimit(
  request: RequestLike,
  userId: string
): Promise<RateLimitHit | null> {
  const ip = getClientIpAddress(request);
  const redis = await getRedis();

  if (redis) {
    const key = `comment:rate:${userId}:${ip}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, WINDOW_SEC);
    }

    if (count <= MAX_ATTEMPTS) {
      return null;
    }

    const ttl = await redis.ttl(key);

    return {
      retryAfterSeconds: Math.max(1, ttl > 0 ? ttl : WINDOW_SEC),
    };
  }

  const now = Date.now();
  const store = memoryStore();
  const key = bucketKey(userId, ip);
  const existing = store.get(key);

  if (!existing || now - existing.windowStartedAt > WINDOW_SEC * 1000) {
    store.set(key, { count: 1, windowStartedAt: now });
    return null;
  }

  if (existing.count >= MAX_ATTEMPTS) {
    return {
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.windowStartedAt + WINDOW_SEC * 1000 - now) / 1000)
      ),
    };
  }

  existing.count += 1;
  store.set(key, existing);
  return null;
}
