import { NextResponse } from "next/server";

import { isServiceError } from "@/services/service-error";
import type { ValidationFailure } from "@/validators/validation";

export function jsonError(
  body: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    requestId?: string;
  },
  status: number
) {
  return NextResponse.json(body, { status });
}

export function unauthorizedJson() {
  return jsonError(
    {
      code: "UNAUTHORIZED",
      message: "Authentication is required.",
    },
    401
  );
}

export function invalidJsonBody() {
  return jsonError(
    {
      code: "INVALID_JSON",
      message: "Request body must be valid JSON.",
    },
    400
  );
}

export function validationErrorJson(validationResult: ValidationFailure) {
  return jsonError(validationResult.error, 400);
}

export function serviceErrorJson(error: unknown) {
  if (!isServiceError(error)) {
    return null;
  }

  return jsonError(
    {
      code: error.code,
      message: error.message,
      fields: error.fields,
    },
    error.statusCode
  );
}
