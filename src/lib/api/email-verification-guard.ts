import type { Session } from "next-auth";
import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/api-errors";
import { isAuthenticatedSession } from "@/lib/auth/authorization";
import { isVerificationGraceExpired } from "@/lib/auth/email-verification";

export const EMAIL_NOT_VERIFIED_CODE = "EMAIL_NOT_VERIFIED";

export const EMAIL_NOT_VERIFIED_MESSAGE =
  "Email chưa được xác thực. Link xác thực đã hết hạn sau 1 ngày — hãy gửi lại email xác thực để tiếp tục.";

/** Returns 403 when the user's verification grace period has expired. */
export function emailVerificationBlockedJson(
  session: Session | null | undefined
): NextResponse | null {
  if (!isAuthenticatedSession(session)) {
    return null;
  }

  if (!isVerificationGraceExpired(session.user)) {
    return null;
  }

  return jsonError(
    {
      code: EMAIL_NOT_VERIFIED_CODE,
      message: EMAIL_NOT_VERIFIED_MESSAGE,
    },
    403
  );
}
