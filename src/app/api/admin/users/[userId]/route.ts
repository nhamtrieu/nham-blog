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
import { userService } from "@/services";
import { validateUpdateAssignableRoleInput } from "@/validators/user-role.validator";

type UserRouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(request: Request, { params }: UserRouteContext) {
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

    const validationResult = validateUpdateAssignableRoleInput(requestBody);

    if (!validationResult.success) {
      return validationErrorJson(validationResult);
    }

    const { userId: targetUserId } = await params;
    const user = await userService.updateAssignableRole({
      userId: targetUserId,
      role: validationResult.data.role,
    });

    return NextResponse.json(user);
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
