import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/auth";
import {
  jsonError,
  serviceErrorJson,
  unauthorizedJson,
} from "@/lib/api/api-errors";
import {
  getRequestId,
  logApiServerErrorAndRespond,
} from "@/lib/api/api-logging";
import { assertResendVerificationRateLimit } from "@/lib/api/resend-verification-rate-limit";
import { isAuthenticatedSession } from "@/lib/auth/authorization";
import { emailVerificationService } from "@/services";

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const session = await getServerAuthSession();

    if (!isAuthenticatedSession(session)) {
      return unauthorizedJson();
    }

    if (session.user.emailVerified) {
      return jsonError(
        {
          code: "CONFLICT",
          message: "Email is already verified.",
        },
        409
      );
    }

    if (!(await assertResendVerificationRateLimit(session.user.id))) {
      return jsonError(
        {
          code: "RATE_LIMITED",
          message: "Bạn gửi lại email quá nhiều lần. Đợi vài phút rồi thử lại.",
        },
        429
      );
    }

    const issueResult = await emailVerificationService.issueAndEnqueue(session.user.id);

    return NextResponse.json({
      ok: true,
      queued: issueResult.queued,
      ...(issueResult.queued
        ? {}
        : { warning: issueResult.queueError ?? "Failed to queue verification email." }),
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
