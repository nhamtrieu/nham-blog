import assert from "node:assert/strict";
import test from "node:test";

import {
  getRequestId,
  logApiServerErrorAndRespond,
} from "@/lib/api/api-logging";

test("getRequestId reuses the incoming request id header when present", () => {
  const request = new Request("http://localhost:3000/api/admin/posts", {
    headers: {
      "x-request-id": "req-from-client",
    },
  });

  assert.equal(getRequestId(request), "req-from-client");
});

test("logApiServerErrorAndRespond logs route, userId, requestId, and returns a 500 response", async () => {
  const request = new Request("http://localhost:3000/api/admin/posts", {
    method: "POST",
  });
  const originalConsoleError = console.error;
  const consoleCalls: string[] = [];

  console.error = (message?: unknown) => {
    consoleCalls.push(String(message));
  };

  try {
    const response = logApiServerErrorAndRespond({
      error: new Error("Boom"),
      request,
      requestId: "req-123",
      userId: "user-456",
    });

    assert.equal(response.status, 500);
    assert.equal(response.headers.get("x-request-id"), "req-123");
    assert.deepEqual(await response.json(), {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred.",
      requestId: "req-123",
    });

    assert.equal(consoleCalls.length, 1);

    const loggedPayload = JSON.parse(consoleCalls[0]) as {
      level: string;
      type: string;
      route: string;
      requestId: string;
      userId: string | null;
      error: {
        name: string;
        message: string;
      };
    };

    assert.equal(loggedPayload.level, "error");
    assert.equal(loggedPayload.type, "admin_api_server_error");
    assert.equal(loggedPayload.route, "POST /api/admin/posts");
    assert.equal(loggedPayload.requestId, "req-123");
    assert.equal(loggedPayload.userId, "user-456");
    assert.equal(loggedPayload.error.name, "Error");
    assert.equal(loggedPayload.error.message, "Boom");
  } finally {
    console.error = originalConsoleError;
  }
});
