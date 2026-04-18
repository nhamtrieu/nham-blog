import { randomUUID } from "node:crypto";

import { jsonError } from "@/lib/api/api-errors";

type LogServerErrorParams = {
  error: unknown;
  request: Request;
  requestId: string;
  userId?: string | null;
};

type SerializedError = {
  name: string;
  message: string;
  stack?: string;
};

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : "Unknown error",
  };
}

export function getRequestId(request: Request) {
  const requestId = request.headers.get("x-request-id")?.trim();

  return requestId && requestId.length > 0 ? requestId : randomUUID();
}

export function logApiServerError({
  error,
  request,
  requestId,
  userId,
}: LogServerErrorParams) {
  const route = `${request.method} ${new URL(request.url).pathname}`;

  console.error(
    JSON.stringify({
      level: "error",
      type: "admin_api_server_error",
      route,
      requestId,
      userId: userId ?? null,
      error: serializeError(error),
    })
  );
}

export function internalServerErrorJson(requestId: string) {
  const response = jsonError(
    {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred.",
      requestId,
    },
    500
  );

  response.headers.set("x-request-id", requestId);

  return response;
}

export function logApiServerErrorAndRespond(params: LogServerErrorParams) {
  logApiServerError(params);

  return internalServerErrorJson(params.requestId);
}
