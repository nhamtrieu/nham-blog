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
import { isAuthenticatedSession } from "@/lib/auth/authorization";
import { commentService } from "@/services";
import { validateCommentUpdateInput } from "@/validators/comment.validator";

type CommentRouteContext = {
  params: Promise<{
    commentId: string;
  }>;
};

export async function PATCH(request: Request, { params }: CommentRouteContext) {
  const requestId = getRequestId(request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isAuthenticatedSession(session)) {
      return unauthorizedJson();
    }

    userId = session.user.id;

    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return invalidJsonBody();
    }

    const validationResult = validateCommentUpdateInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    const { commentId } = await params;
    const comment = await commentService.updateOwnComment({
      commentId,
      authorId: userId,
      input: validationResult.data,
    });

    return NextResponse.json({ comment });
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

export async function DELETE(request: Request, { params }: CommentRouteContext) {
  const requestId = getRequestId(request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isAuthenticatedSession(session)) {
      return unauthorizedJson();
    }

    userId = session.user.id;
    const { commentId } = await params;

    await commentService.deleteOwnComment({
      commentId,
      authorId: userId,
    });

    return new NextResponse(null, { status: 204 });
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
