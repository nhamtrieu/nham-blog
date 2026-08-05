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
import { isWriterSession } from "@/lib/auth/authorization";
import { tagService } from "@/services";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isWriterSession(session)) {
      return unauthorizedJson();
    }

    userId = session.user.id;
    const tags = await tagService.listTags();

    return NextResponse.json({ items: tags });
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
