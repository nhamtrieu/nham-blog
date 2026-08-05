import { v2 as cloudinary } from "cloudinary";

import { env } from "@/env";

export const CLOUDINARY_UPLOAD_FOLDER = "nham-blog/admin";
export const CLOUDINARY_AVATAR_FOLDER = "nham-blog/avatars";
export const CLOUDINARY_UPLOAD_RESOURCE_TYPE = "image";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export type SignedUploadPayload = {
  apiKey: string;
  cloudName: string;
  folder: string;
  resourceType: typeof CLOUDINARY_UPLOAD_RESOURCE_TYPE;
  signature: string;
  timestamp: number;
  uploadUrl: string;
};

function getCloudinaryConfig(): CloudinaryConfig | null {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    return null;
  }

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  };
}

export function isCloudinaryConfigured() {
  return getCloudinaryConfig() !== null;
}

export function createSignedUploadPayload(
  options: {
    folder?: string;
    timestamp?: number;
  } = {}
): SignedUploadPayload {
  const config = getCloudinaryConfig();

  if (!config) {
    throw new Error("Cloudinary is not configured.");
  }

  const folder = options.folder ?? CLOUDINARY_UPLOAD_FOLDER;
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      folder,
      timestamp: String(timestamp),
    },
    config.apiSecret
  );

  return {
    apiKey: config.apiKey,
    cloudName: config.cloudName,
    folder,
    resourceType: CLOUDINARY_UPLOAD_RESOURCE_TYPE,
    signature,
    timestamp,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/${CLOUDINARY_UPLOAD_RESOURCE_TYPE}/upload`,
  };
}
