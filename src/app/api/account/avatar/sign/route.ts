import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/auth";
import { jsonError, unauthorizedJson } from "@/lib/api/api-errors";
import { emailVerificationBlockedJson } from "@/lib/api/email-verification-guard";
import { isAuthenticatedSession } from "@/lib/auth/authorization";
import {
  CLOUDINARY_AVATAR_FOLDER,
  createSignedUploadPayload,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";

export async function POST() {
  const session = await getServerAuthSession();

  if (!isAuthenticatedSession(session)) {
    return unauthorizedJson();
  }

  const verificationBlock = emailVerificationBlockedJson(session);

  if (verificationBlock) {
    return verificationBlock;
  }

  if (!isCloudinaryConfigured()) {
    return jsonError(
      {
        code: "CLOUDINARY_NOT_CONFIGURED",
        message: "Cloudinary is not configured.",
      },
      500
    );
  }

  return NextResponse.json(
    createSignedUploadPayload({
      folder: CLOUDINARY_AVATAR_FOLDER,
    })
  );
}
