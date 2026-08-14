import { getClientIpAddress, type RequestLike } from "@/lib/auth/request-ip";
import { getRedis } from "@/lib/redis/client";

const WINDOW_SEC = 10 * 60;
const MAX_ATTEMPTS = 3;

const globalMemory = globalThis as typeof globalThis & {
  __nhamForgotPasswordRateLimitMemory?: Map<string, { count: number; windowStartedAt: number }>;
};

function memoryStore() {
  if (!globalMemory.__nhamForgotPasswordRateLimitMemory) {
    globalMemory.__nhamForgotPasswordRateLimitMemory = new Map();
  }

  return globalMemory.__nhamForgotPasswordRateLimitMemory;
}

/** Returns false when this IP has hit the forgot-password cap for this window. */
export async function assertForgotPasswordRateLimit(request?: RequestLike): Promise<boolean> {
  const ip = getClientIpAddress(request);
  const redis = await getRedis();

  if (redis) {
    const key = `auth:forgot-password:${ip}`;
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
