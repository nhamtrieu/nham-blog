import { getRedis } from "@/lib/redis/client";

const WINDOW_SEC = 10 * 60;
const MAX_ATTEMPTS = 3;

const globalMemory = globalThis as typeof globalThis & {
  __nhamEmailResendRateLimitMemory?: Map<string, { count: number; windowStartedAt: number }>;
};

function memoryStore() {
  if (!globalMemory.__nhamEmailResendRateLimitMemory) {
    globalMemory.__nhamEmailResendRateLimitMemory = new Map();
  }

  return globalMemory.__nhamEmailResendRateLimitMemory;
}

/** Returns false when the user has hit the resend cap for this window. */
export async function assertResendVerificationRateLimit(userId: string): Promise<boolean> {
  const redis = await getRedis();

  if (redis) {
    const key = `auth:verify-resend:${userId}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, WINDOW_SEC);
    }

    return count <= MAX_ATTEMPTS;
  }

  const now = Date.now();
  const store = memoryStore();
  const existing = store.get(userId);

  if (!existing || now - existing.windowStartedAt > WINDOW_SEC * 1000) {
    store.set(userId, { count: 1, windowStartedAt: now });
    return true;
  }

  if (existing.count >= MAX_ATTEMPTS) {
    return false;
  }

  existing.count += 1;
  store.set(userId, existing);
  return true;
}
