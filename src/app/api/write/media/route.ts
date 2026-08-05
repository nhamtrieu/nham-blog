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
import { isWriterSession } from "@/lib/auth/authorization";
import { mediaService } from "@/services";
import { validateMediaAssetCreateInput } from "@/validators/media.validator";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isWriterSession(session)) {
      return unauthorizedJson();
    }

    userId = session.user.id;

    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return invalidJsonBody();
    }

    const validationResult = validateMediaAssetCreateInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    const mediaAsset = await mediaService.createMediaAsset({
      ...validationResult.data,
      uploadedById: userId,
    });

    return NextResponse.json(mediaAsset, { status: 201 });
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
