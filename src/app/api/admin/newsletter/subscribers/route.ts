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
import { NewsletterSubscriberStatus } from "@/entities/newsletter-subscriber.entity";
import { newsletterService } from "@/services";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  let userId: string | null = null;

  try {
    const session = await getServerAuthSession();

    if (!isAdminSession(session)) {
      return unauthorizedJson();
    }

    userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const search = searchParams.get("search") ?? undefined;
    const status =
      statusParam &&
      Object.values(NewsletterSubscriberStatus).includes(
        statusParam as NewsletterSubscriberStatus
      )
        ? (statusParam as NewsletterSubscriberStatus)
        : undefined;

    const result = await newsletterService.listSubscribers({ status, search });

    return NextResponse.json(result);
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
