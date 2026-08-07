import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/auth";
import { serviceErrorJson } from "@/lib/api/api-errors";
import {
  getRequestId,
  logApiServerErrorAndRespond,
} from "@/lib/api/api-logging";
import { isAuthenticatedSession } from "@/lib/auth/authorization";
import { postEngagementService } from "@/services";

type EngagementRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: Request, { params }: EngagementRouteContext) {
  const requestId = getRequestId(request);

  try {
    const session = await getServerAuthSession();
    const { slug } = await params;
    const engagement = await postEngagementService.getEngagementForPostSlug({
      slug,
      userId: isAuthenticatedSession(session) ? session.user.id : null,
    });

    return NextResponse.json(engagement);
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
