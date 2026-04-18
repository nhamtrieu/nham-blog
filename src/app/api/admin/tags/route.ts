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
import { tagService } from "@/services";
import { validateTagCreateInput } from "@/validators/tag.validator";

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

    const validationResult = validateTagCreateInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    const tag = await tagService.createTag({
      input: validationResult.data,
    });

    return NextResponse.json(tag, { status: 201 });
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
