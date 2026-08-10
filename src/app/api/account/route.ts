import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/auth";
import {
  invalidJsonBody,
  serviceErrorJson,
  unauthorizedJson,
  validationErrorJson,
} from "@/lib/api/api-errors";
import {
  getRequestId,
  logApiServerErrorAndRespond,
} from "@/lib/api/api-logging";
import { emailVerificationBlockedJson } from "@/lib/api/email-verification-guard";
import { isAuthenticatedSession } from "@/lib/auth/authorization";
import { accountProfileService } from "@/services/account-profile.service";
import { validateAccountProfileUpdateInput } from "@/validators/account-profile.validator";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isAuthenticatedSession(session)) {
      return unauthorizedJson();
    }

    userId = session.user.id;
    const profile = await accountProfileService.getProfile(userId);

    return NextResponse.json({ profile });
  } catch (error) {
    const handledErrorResponse = serviceErrorJson(error);

    if (handledErrorResponse) {
      return handledErrorResponse;
    }

    return logApiServerErrorAndRespond({
      error,
      request,
      requestId,
      userId,
    });
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isAuthenticatedSession(session)) {
      return unauthorizedJson();
    }

    const verificationBlock = emailVerificationBlockedJson(session);

    if (verificationBlock) {
      return verificationBlock;
    }

    userId = session.user.id;

    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return invalidJsonBody();
    }

    const validationResult = validateAccountProfileUpdateInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    const profile = await accountProfileService.updateProfile(
      userId,
      validationResult.data
    );

    return NextResponse.json({ profile });
  } catch (error) {
    const handledErrorResponse = serviceErrorJson(error);

    if (handledErrorResponse) {
      return handledErrorResponse;
    }

    return logApiServerErrorAndRespond({
      error,
      request,
      requestId,
      userId,
    });
  }
}
