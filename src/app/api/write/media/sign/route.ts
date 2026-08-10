import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/auth";
import { jsonError, unauthorizedJson } from "@/lib/api/api-errors";
import { emailVerificationBlockedJson } from "@/lib/api/email-verification-guard";
import { isWriterSession } from "@/lib/auth/authorization";
import {
  createSignedUploadPayload,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";

export async function POST() {
  const session = await getServerAuthSession();

  if (!isWriterSession(session)) {
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

  return NextResponse.json(createSignedUploadPayload());
}
