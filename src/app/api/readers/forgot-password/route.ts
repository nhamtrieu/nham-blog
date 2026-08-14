import { NextResponse } from "next/server";

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
import { assertForgotPasswordRateLimit } from "@/lib/api/forgot-password-rate-limit";
import { passwordResetService } from "@/services";
import { validateReaderForgotPasswordInput } from "@/validators/reader-auth.validator";

const GENERIC_OK_MESSAGE =
  "Nếu email tồn tại và có mật khẩu, chúng tôi đã gửi link đặt lại. Kiểm tra hộp thư (và spam).";

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return invalidJsonBody();
    }

    const validationResult = validateReaderForgotPasswordInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    if (!(await assertForgotPasswordRateLimit(request))) {
      return jsonError(
        {
          code: "RATE_LIMITED",
          message: "Bạn đã yêu cầu quá nhiều lần. Đợi vài phút rồi thử lại.",
        },
        429
      );
    }

    await passwordResetService.requestReset(validationResult.data.email);

    return NextResponse.json({
      ok: true,
      message: GENERIC_OK_MESSAGE,
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
