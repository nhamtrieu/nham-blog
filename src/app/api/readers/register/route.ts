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
import { clearFailedLoginAttempts } from "@/lib/auth/login-rate-limit";
import { assertRegisterRateLimit } from "@/lib/auth/register-rate-limit";
import { emailVerificationService, readerAuthService } from "@/services";
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

    if (!(await assertRegisterRateLimit(request))) {
      return jsonError(
        {
          code: "RATE_LIMITED",
          message: "Bạn đã tạo quá nhiều tài khoản. Thử lại sau một giờ.",
        },
        429
      );
    }

    const reader = await readerAuthService.registerReader(validationResult.data);
    await clearFailedLoginAttempts(reader.email, request);
    const issueResult = await emailVerificationService.issueAndEnqueue(reader.id);

    return NextResponse.json(
      {
        ...reader,
        verificationEmailQueued: issueResult.queued,
        ...(issueResult.queued
          ? {}
          : {
            verificationEmailWarning:
              "Tài khoản đã tạo, nhưng chưa gửi được email xác thực. Dùng nút Gửi lại email sau khi đăng nhập.",
          }),
      },
      { status: 201 }
    );
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
