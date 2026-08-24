import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/auth";
import {
  invalidJsonBody,
  jsonError,
  serviceErrorJson,
  validationErrorJson,
} from "@/lib/api/api-errors";
import {
  getRequestId,
  logApiServerErrorAndRespond,
} from "@/lib/api/api-logging";
import { assertNewsletterSubscribeRateLimit } from "@/lib/api/newsletter-subscribe-rate-limit";
import { isAuthenticatedSession } from "@/lib/auth/authorization";
import { newsletterService } from "@/services";
import { validateNewsletterSubscribeInput } from "@/validators/newsletter.validator";

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return invalidJsonBody();
    }

    const validationResult = validateNewsletterSubscribeInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    if (!(await assertNewsletterSubscribeRateLimit(request))) {
      return jsonError(
        {
          code: "RATE_LIMITED",
          message: "Bạn đã đăng ký quá nhiều lần. Đợi vài phút rồi thử lại.",
        },
        429
      );
    }

    const session = await getServerAuthSession();
    const userId = isAuthenticatedSession(session) ? session.user.id : null;

    const result = await newsletterService.subscribe({
      email: validationResult.data.email,
      source: validationResult.data.source,
      userId,
    });

    return NextResponse.json(result);
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
