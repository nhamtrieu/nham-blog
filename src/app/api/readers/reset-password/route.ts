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
import { passwordResetService } from "@/services";
import { validateReaderResetPasswordInput } from "@/validators/reader-auth.validator";

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return invalidJsonBody();
    }

    const validationResult = validateReaderResetPasswordInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    await passwordResetService.resetWithRawToken(
      validationResult.data.token,
      validationResult.data.password
    );

    return NextResponse.json({
      ok: true,
      message: "Mật khẩu đã được cập nhật. Bạn có thể đăng nhập.",
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
