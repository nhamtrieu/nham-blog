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
import { isAuthenticatedSession } from "@/lib/auth/authorization";
import { notificationService } from "@/services";

type NotificationRouteContext = {
  params: Promise<{
    notificationId: string;
  }>;
};

export async function PATCH(request: Request, { params }: NotificationRouteContext) {
  const requestId = getRequestId(request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isAuthenticatedSession(session)) {
      return unauthorizedJson();
    }

    userId = session.user.id;
    const { notificationId } = await params;
    const notification = await notificationService.markRead({
      userId,
      notificationId,
    });

    return NextResponse.json(notification);
  } catch (error) {
    const handled = serviceErrorJson(error);

    if (handled) {
      return handled;
    }

    return logApiServerErrorAndRespond({
      error,
      request,
      requestId,
      userId,
    });
  }
}
