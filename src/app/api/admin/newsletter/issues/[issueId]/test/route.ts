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
import { isAdminSession } from "@/lib/auth/authorization";
import { newsletterService } from "@/services";
import { validateNewsletterTestSendInput } from "@/validators/newsletter.validator";

type RouteContext = {
  params: Promise<{
    issueId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isAdminSession(session)) {
      return unauthorizedJson();
    }

    userId = session.user.id;

    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return invalidJsonBody();
    }

    const validationResult = validateNewsletterTestSendInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    const { issueId } = await params;
    await newsletterService.sendTestIssue(issueId, validationResult.data.email);

    return NextResponse.json({ ok: true });
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
