import { NextResponse } from "next/server";

import {
  invalidJsonBody,
  serviceErrorJson,
  validationErrorJson,
} from "@/lib/api/api-errors";
import {
  getRequestId,
  logApiServerErrorAndRespond,
} from "@/lib/api/api-logging";
import { readerAuthService } from "@/services";
import { validateReaderRegisterInput } from "@/validators/reader-auth.validator";

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return invalidJsonBody();
    }

    const validationResult = validateReaderRegisterInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    const reader = await readerAuthService.registerReader(validationResult.data);

    return NextResponse.json(reader, { status: 201 });
  } catch (error) {
    const handledErrorResponse = serviceErrorJson(error);

    if (handledErrorResponse) {
      return handledErrorResponse;
    }

    return logApiServerErrorAndRespond({
      error,
      request,
      requestId,
    });
  }
}
