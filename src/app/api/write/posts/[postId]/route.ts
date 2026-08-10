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
import { isWriterSession } from "@/lib/auth/authorization";
import { toWriterUpdateInput } from "@/lib/write/writer-post-payload";
import { postService } from "@/services";
import { validatePostUpdateInput } from "@/validators/post.validator";

type PostRouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function GET(_request: Request, { params }: PostRouteContext) {
  const requestId = getRequestId(_request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isWriterSession(session)) {
      return unauthorizedJson();
    }

    userId = session.user.id;
    const { postId } = await params;
    const post = await postService.getPostForAuthor(postId, userId);

    return NextResponse.json(post);
  } catch (error) {
    const handledErrorResponse = serviceErrorJson(error);

    if (handledErrorResponse) {
      return handledErrorResponse;
    }

    return logApiServerErrorAndRespond({
      error,
      request: _request,
      requestId,
      userId,
    });
  }
}

export async function PATCH(request: Request, { params }: PostRouteContext) {
  const requestId = getRequestId(request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isWriterSession(session)) {
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

    const validationResult = validatePostUpdateInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    const { postId } = await params;
    await postService.getPostForAuthor(postId, userId);

    const post = await postService.updatePost({
      postId,
      input: toWriterUpdateInput(validationResult.data),
    });

    return NextResponse.json(post);
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

export async function DELETE(_request: Request, { params }: PostRouteContext) {
  const requestId = getRequestId(_request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isWriterSession(session)) {
      return unauthorizedJson();
    }

    const verificationBlock = emailVerificationBlockedJson(session);

    if (verificationBlock) {
      return verificationBlock;
    }

    userId = session.user.id;
    const { postId } = await params;
    await postService.deletePostForAuthor(postId, userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const handledErrorResponse = serviceErrorJson(error);

    if (handledErrorResponse) {
      return handledErrorResponse;
    }

    return logApiServerErrorAndRespond({
      error,
      request: _request,
      requestId,
      userId,
    });
  }
}
