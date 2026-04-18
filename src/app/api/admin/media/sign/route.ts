import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/auth";
import { jsonError, unauthorizedJson } from "@/lib/api/api-errors";
import {
  createSignedUploadPayload,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";

export async function POST() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return unauthorizedJson();
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
