const COMMENT_WINDOW_MS = 60_000;
const COMMENT_MAX_ATTEMPTS = 5;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export function assertCommentRateLimit(request: Request, userId: string) {
  const now = Date.now();
  const key = `${userId}:${getClientIp(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + COMMENT_WINDOW_MS,
    });
    return null;
  }

  if (bucket.count >= COMMENT_MAX_ATTEMPTS) {
    return {
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return null;
}
