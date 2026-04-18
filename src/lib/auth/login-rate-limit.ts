import { LOGIN_RATE_LIMIT_ERROR_CODE } from "@/lib/auth/auth-error-codes";

const FAILURE_WINDOW_MS = 10 * 60 * 1000;
const BLOCK_DURATION_MS = 10 * 60 * 1000;
const MAX_FAILURES = 5;

type RequestLike = {
  headers?: Headers | Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: {
    remoteAddress?: string | null;
  };
};

type LoginRateLimitEntry = {
  blockedUntil: number | null;
  failureCount: number;
  firstFailedAt: number;
  lastAttemptAt: number;
};

type LoginRateLimitGlobalState = {
  store: Map<string, LoginRateLimitEntry>;
};

const globalForLoginRateLimit = globalThis as typeof globalThis & {
  __nhamLoginRateLimit?: LoginRateLimitGlobalState;
};

function getGlobalState() {
  if (!globalForLoginRateLimit.__nhamLoginRateLimit) {
    globalForLoginRateLimit.__nhamLoginRateLimit = {
      store: new Map(),
    };
  }

  return globalForLoginRateLimit.__nhamLoginRateLimit;
}

function readHeader(
  headers: RequestLike["headers"],
  headerName: string
): string | string[] | undefined {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof Headers) {
    return headers.get(headerName) ?? undefined;
  }

  const normalizedHeaderName = headerName.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === normalizedHeaderName) {
      return value;
    }
  }

  return undefined;
}

function getClientIpAddress(request: RequestLike | undefined) {
  const forwardedFor = readHeader(request?.headers, "x-forwarded-for");

  if (typeof forwardedFor === "string" && forwardedFor.trim().length > 0) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0]?.trim() || "unknown";
  }

  const realIp = readHeader(request?.headers, "x-real-ip");

  if (typeof realIp === "string" && realIp.trim().length > 0) {
    return realIp.trim();
  }

  if (typeof request?.ip === "string" && request.ip.trim().length > 0) {
    return request.ip.trim();
  }

  if (typeof request?.socket?.remoteAddress === "string" && request.socket.remoteAddress) {
    return request.socket.remoteAddress;
  }

  return "unknown";
}

function getLoginRateLimitKey(email: string, request: RequestLike | undefined) {
  return `${getClientIpAddress(request)}:${email.trim().toLowerCase()}`;
}

function cleanupExpiredEntries(now: number) {
  const { store } = getGlobalState();

  for (const [key, entry] of store.entries()) {
    const isWindowExpired = now - entry.firstFailedAt > FAILURE_WINDOW_MS;
    const isBlockExpired = entry.blockedUntil !== null && entry.blockedUntil <= now;

    if (isBlockExpired || isWindowExpired) {
      store.delete(key);
    }
  }
}

export function assertLoginRateLimit(email: string, request?: RequestLike) {
  const now = Date.now();

  cleanupExpiredEntries(now);

  const { store } = getGlobalState();
  const entry = store.get(getLoginRateLimitKey(email, request));

  if (entry?.blockedUntil && entry.blockedUntil > now) {
    throw new Error(LOGIN_RATE_LIMIT_ERROR_CODE);
  }
}

export function recordFailedLoginAttempt(email: string, request?: RequestLike) {
  const now = Date.now();

  cleanupExpiredEntries(now);

  const { store } = getGlobalState();
  const key = getLoginRateLimitKey(email, request);
  const existingEntry = store.get(key);

  if (!existingEntry || now - existingEntry.firstFailedAt > FAILURE_WINDOW_MS) {
    store.set(key, {
      blockedUntil: null,
      failureCount: 1,
      firstFailedAt: now,
      lastAttemptAt: now,
    });
    return;
  }

  const failureCount = existingEntry.failureCount + 1;

  store.set(key, {
    ...existingEntry,
    blockedUntil: failureCount >= MAX_FAILURES ? now + BLOCK_DURATION_MS : null,
    failureCount,
    lastAttemptAt: now,
  });
}

export function clearFailedLoginAttempts(email: string, request?: RequestLike) {
  getGlobalState().store.delete(getLoginRateLimitKey(email, request));
}
