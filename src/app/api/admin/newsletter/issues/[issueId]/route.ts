import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/auth";
import {
  serviceErrorJson,
  unauthorizedJson,
} from "@/lib/api/api-errors";
import {
  getRequestId,
  logApiServerErrorAndRespond,
} from "@/lib/api/api-logging";
import { isAdminSession } from "@/lib/auth/authorization";
import { newsletterService } from "@/services";

type RouteContext = {
  params: Promise<{
    issueId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isAdminSession(session)) {
      return unauthorizedJson();
    }

    userId = session.user.id;
    const { issueId } = await params;
    const issue = await newsletterService.getIssue(issueId);

    return NextResponse.json(issue);
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
