import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/auth";
import { serviceErrorJson, unauthorizedJson } from "@/lib/api/api-errors";
import {
  getRequestId,
  logApiServerErrorAndRespond,
} from "@/lib/api/api-logging";
import { emailVerificationBlockedJson } from "@/lib/api/email-verification-guard";
import { isAuthenticatedSession } from "@/lib/auth/authorization";
import { postEngagementService } from "@/services";

type LikeRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(request: Request, { params }: LikeRouteContext) {
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
    const { slug } = await params;
    const engagement = await postEngagementService.likePost({
      slug,
      userId,
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
      userId,
    });
  }
}

export async function DELETE(request: Request, { params }: LikeRouteContext) {
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
    const { slug } = await params;
    const engagement = await postEngagementService.unlikePost({
      slug,
      userId,
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
      userId,
    });
  }
}
