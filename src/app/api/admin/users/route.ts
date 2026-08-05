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
import { isAdminSession } from "@/lib/auth/authorization";
import { userService } from "@/services";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isAdminSession(session)) {
      return unauthorizedJson();
    }

    userId = session.user.id;
    const users = await userService.listUsersForAdmin();

    return NextResponse.json({ items: users });
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
