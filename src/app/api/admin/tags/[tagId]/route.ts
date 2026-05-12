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
import { tagService } from "@/services";
import { validateTagUpdateInput } from "@/validators/tag.validator";

type TagRouteContext = {
  params: Promise<{
    tagId: string;
  }>;
};

export async function PATCH(request: Request, { params }: TagRouteContext) {
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

    const validationResult = validateTagUpdateInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    const { tagId } = await params;

    const tag = await tagService.updateTag({
      tagId,
      input: validationResult.data,
    });

    return NextResponse.json(tag);
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

export async function DELETE(_request: Request, { params }: TagRouteContext) {
  const requestId = getRequestId(_request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isAdminSession(session)) {
      return unauthorizedJson();
    }

    userId = session.user.id;

    const { tagId } = await params;

    await tagService.deleteTag(tagId);

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
