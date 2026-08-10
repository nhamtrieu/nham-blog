type RequestLike = {
  headers?: Headers | Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: {
    remoteAddress?: string | null;
  };
};

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

export function getClientIpAddress(request: RequestLike | undefined) {
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

export type { RequestLike };
