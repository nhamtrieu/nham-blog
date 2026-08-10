import { LOGIN_RATE_LIMIT_ERROR_CODE } from "@/lib/auth/auth-error-codes";
import { getClientIpAddress, type RequestLike } from "@/lib/auth/request-ip";
import { getRedis } from "@/lib/redis/client";

const FAILURE_WINDOW_SEC = 10 * 60;
const BLOCK_DURATION_SEC = 10 * 60;
const MAX_FAILURES = 5;

type MemoryEntry = {
  blockedUntil: number | null;
  failureCount: number;
  firstFailedAt: number;
};

const globalMemory = globalThis as typeof globalThis & {
  __nhamLoginRateLimitMemory?: Map<string, MemoryEntry>;
};

function memoryStore() {
  if (!globalMemory.__nhamLoginRateLimitMemory) {
    globalMemory.__nhamLoginRateLimitMemory = new Map();
  }

  return globalMemory.__nhamLoginRateLimitMemory;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function failKey(email: string, ip: string) {
  return `auth:login:fail:${normalizeEmail(email)}:${ip}`;
}

function blockKey(email: string, ip: string) {
  return `auth:login:block:${normalizeEmail(email)}:${ip}`;
}

function emailIndexKey(email: string) {
  return `auth:login:idx:${normalizeEmail(email)}`;
}

function memoryKey(email: string, ip: string) {
  return `${normalizeEmail(email)}:${ip}`;
}

async function isBlockedRedis(email: string, ip: string) {
  const redis = await getRedis();

  if (!redis) {
    return null;
  }

  return (await redis.exists(blockKey(email, ip))) === 1;
}

function isBlockedMemory(email: string, ip: string) {
  const now = Date.now();
  const store = memoryStore();
  const entry = store.get(memoryKey(email, ip));

  if (!entry) {
    return false;
  }

  if (entry.blockedUntil && entry.blockedUntil > now) {
    return true;
  }

  if (now - entry.firstFailedAt > FAILURE_WINDOW_SEC * 1000) {
    store.delete(memoryKey(email, ip));
    return false;
  }

  return false;
}

export async function assertLoginRateLimit(email: string, request?: RequestLike) {
  const ip = getClientIpAddress(request);
  const redisBlocked = await isBlockedRedis(email, ip);

  if (redisBlocked === true || (redisBlocked === null && isBlockedMemory(email, ip))) {
    throw new Error(LOGIN_RATE_LIMIT_ERROR_CODE);
  }
}

export async function recordFailedLoginAttempt(email: string, request?: RequestLike) {
  const ip = getClientIpAddress(request);
  const redis = await getRedis();

  if (redis) {
    const fKey = failKey(email, ip);
    const bKey = blockKey(email, ip);
    const idxKey = emailIndexKey(email);
    const count = await redis.incr(fKey);

    if (count === 1) {
      await redis.expire(fKey, FAILURE_WINDOW_SEC);
    }

    await redis.sadd(idxKey, ip);
    await redis.expire(idxKey, FAILURE_WINDOW_SEC + BLOCK_DURATION_SEC);

    if (count >= MAX_FAILURES) {
      await redis.set(bKey, "1", "EX", BLOCK_DURATION_SEC);
    }

    return;
  }

  const now = Date.now();
  const store = memoryStore();
  const key = memoryKey(email, ip);
  const existing = store.get(key);

  if (!existing || now - existing.firstFailedAt > FAILURE_WINDOW_SEC * 1000) {
    store.set(key, {
      blockedUntil: null,
      failureCount: 1,
      firstFailedAt: now,
    });
    return;
  }

  const failureCount = existing.failureCount + 1;
  store.set(key, {
    ...existing,
    blockedUntil: failureCount >= MAX_FAILURES ? now + BLOCK_DURATION_SEC * 1000 : null,
    failureCount,
  });
}

export async function clearFailedLoginAttempts(email: string, request?: RequestLike) {
  const normalized = normalizeEmail(email);
  const ip = getClientIpAddress(request);
  const redis = await getRedis();

  if (redis) {
    const idxKey = emailIndexKey(normalized);
    const ips = await redis.smembers(idxKey);
    const targets = new Set(ips.length > 0 ? ips : [ip]);
    targets.add(ip);

    const keys: string[] = [idxKey];

    for (const memberIp of targets) {
      keys.push(failKey(normalized, memberIp), blockKey(normalized, memberIp));
    }

    await redis.del(...keys);
  }

  const store = memoryStore();

  for (const key of [...store.keys()]) {
    if (key.startsWith(`${normalized}:`)) {
      store.delete(key);
    }
  }
}
