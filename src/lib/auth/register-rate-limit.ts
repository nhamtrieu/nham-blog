import { getClientIpAddress, type RequestLike } from "@/lib/auth/request-ip";
import { getRedis } from "@/lib/redis/client";

const WINDOW_SEC = 60 * 60;
const MAX_PER_IP = 10;

const globalMemory = globalThis as typeof globalThis & {
  __nhamRegisterRateLimitMemory?: Map<string, { count: number; startedAt: number }>;
};

function memoryStore() {
  if (!globalMemory.__nhamRegisterRateLimitMemory) {
    globalMemory.__nhamRegisterRateLimitMemory = new Map();
  }

  return globalMemory.__nhamRegisterRateLimitMemory;
}

/** Returns false when this IP has registered too many accounts in the window. */
export async function assertRegisterRateLimit(request?: RequestLike): Promise<boolean> {
  const ip = getClientIpAddress(request);
  const redis = await getRedis();

  if (redis) {
    const key = `auth:register:ip:${ip}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, WINDOW_SEC);
    }

    return count <= MAX_PER_IP;
  }

  const now = Date.now();
  const store = memoryStore();
  const existing = store.get(ip);

  if (!existing || now - existing.startedAt > WINDOW_SEC * 1000) {
    store.set(ip, { count: 1, startedAt: now });
    return true;
  }

  if (existing.count >= MAX_PER_IP) {
    return false;
  }

  existing.count += 1;
  store.set(ip, existing);
  return true;
}
