import { getClientIpAddress, type RequestLike } from "@/lib/auth/request-ip";
import { getRedis } from "@/lib/redis/client";

const WINDOW_SEC = 10 * 60;
const MAX_ATTEMPTS = 5;

const globalMemory = globalThis as typeof globalThis & {
  __nhamNewsletterSubscribeRateLimitMemory?: Map<string, { count: number; windowStartedAt: number }>;
};

function memoryStore() {
  if (!globalMemory.__nhamNewsletterSubscribeRateLimitMemory) {
    globalMemory.__nhamNewsletterSubscribeRateLimitMemory = new Map();
  }

  return globalMemory.__nhamNewsletterSubscribeRateLimitMemory;
}

/** Returns false when this IP has hit the newsletter subscribe cap for this window. */
export async function assertNewsletterSubscribeRateLimit(request?: RequestLike): Promise<boolean> {
  const ip = getClientIpAddress(request);
  const redis = await getRedis();

  if (redis) {
    const key = `newsletter:subscribe:${ip}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, WINDOW_SEC);
    }

    return count <= MAX_ATTEMPTS;
  }

  const now = Date.now();
  const store = memoryStore();
  const existing = store.get(ip);

  if (!existing || now - existing.windowStartedAt > WINDOW_SEC * 1000) {
    store.set(ip, { count: 1, windowStartedAt: now });
    return true;
  }

  if (existing.count >= MAX_ATTEMPTS) {
    return false;
  }

  existing.count += 1;
  store.set(ip, existing);
  return true;
}
