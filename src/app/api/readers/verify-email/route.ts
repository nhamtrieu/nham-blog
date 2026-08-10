import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/auth";
import { serviceErrorJson } from "@/lib/api/api-errors";
import {
  getRequestId,
  logApiServerErrorAndRespond,
} from "@/lib/api/api-logging";
import { emailVerificationService } from "@/services";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  try {
    await emailVerificationService.verifyRawToken(token);
    const session = await getServerAuthSession();
    const destination = session?.user?.id
      ? "/?verified=1"
      : "/login?verified=1";

    return NextResponse.redirect(new URL(destination, request.url));
  } catch (error) {
    const handledErrorResponse = serviceErrorJson(error);

    if (handledErrorResponse) {
      return NextResponse.redirect(new URL("/login?verified=0", request.url));
    }

    return logApiServerErrorAndRespond({
      error,
      request,
      requestId,
    });
  }
}
