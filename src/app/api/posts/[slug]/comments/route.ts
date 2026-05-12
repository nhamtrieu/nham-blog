import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/auth";
import {
  invalidJsonBody,
  jsonError,
  serviceErrorJson,
  unauthorizedJson,
  validationErrorJson,
} from "@/lib/api/api-errors";
import {
  getRequestId,
  logApiServerErrorAndRespond,
} from "@/lib/api/api-logging";
import { assertCommentRateLimit } from "@/lib/api/comment-rate-limit";
import { isAuthenticatedSession } from "@/lib/auth/authorization";
import { commentService } from "@/services";
import { validateCommentCreateInput } from "@/validators/comment.validator";

type CommentsRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: Request, { params }: CommentsRouteContext) {
  const requestId = getRequestId(request);

  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? undefined);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const comments = await commentService.listApprovedCommentsForPostSlug({
      slug,
      cursor,
      limit,
    });

    return NextResponse.json(comments);
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

export async function POST(request: Request, { params }: CommentsRouteContext) {
  const requestId = getRequestId(request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isAuthenticatedSession(session)) {
      return unauthorizedJson();
    }

    userId = session.user.id;

    const rateLimit = assertCommentRateLimit(request, userId);

    if (rateLimit) {
      return jsonError(
        {
          code: "RATE_LIMITED",
          message: "Too many comments. Please wait before posting again.",
        },
        429
      );
    }

    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return invalidJsonBody();
    }

    const validationResult = validateCommentCreateInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    const { slug } = await params;
    const comment = await commentService.createCommentForPostSlug({
      slug,
      authorId: userId,
      input: validationResult.data,
    });

    return NextResponse.json(
      {
        comment,
        message: "Comment is waiting for moderation.",
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
      userId,
    });
  }
}
