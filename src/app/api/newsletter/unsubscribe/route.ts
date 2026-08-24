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
import { newsletterService } from "@/services";
import { validateNewsletterUnsubscribeInput } from "@/validators/newsletter.validator";

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return invalidJsonBody();
    }

    const validationResult = validateNewsletterUnsubscribeInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    const result = await newsletterService.unsubscribeRawToken(validationResult.data.token);

    return NextResponse.json({
      ok: true,
      email: result.email,
      message: "Đã hủy đăng ký newsletter.",
    });
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
