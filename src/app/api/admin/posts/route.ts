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
import { postService } from "@/services";
import { validatePostCreateInput } from "@/validators/post.validator";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!session?.user?.id) {
      return unauthorizedJson();
    }

    userId = session.user.id;

    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return invalidJsonBody();
    }

    const validationResult = validatePostCreateInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    const post = await postService.createPost({
      authorId: userId,
      input: validationResult.data,
    });

    return NextResponse.json(post, { status: 201 });
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
