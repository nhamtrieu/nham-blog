import { z } from "zod";

import {
  type ValidationResult,
  validateWithSchema,
} from "@/validators/validation";

const MEDIA_VALIDATION_MESSAGE = "Media asset payload is invalid.";

function normalizeNullableString(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

export const mediaAssetCreateSchema = z.object({
  url: z
    .url("Media URL must be a valid absolute URL.")
    .max(2048, "Media URL must be at most 2048 characters."),
  publicId: z
    .string()
    .trim()
    .min(1, "Public ID is required.")
    .max(255, "Public ID must be at most 255 characters."),
  alt: z.preprocess(
    normalizeNullableString,
    z
      .string()
      .max(255, "Alt text must be at most 255 characters.")
      .nullable()
      .optional()
  ),
  width: z
    .number()
    .int("Width must be an integer.")
    .positive("Width must be greater than zero.")
    .max(10000, "Width must be at most 10000 pixels."),
  height: z
    .number()
    .int("Height must be an integer.")
    .positive("Height must be greater than zero.")
    .max(10000, "Height must be at most 10000 pixels."),
});

export type MediaAssetCreateInput = z.infer<typeof mediaAssetCreateSchema>;

export function validateMediaAssetCreateInput(
  input: unknown
): ValidationResult<MediaAssetCreateInput> {
  return validateWithSchema(mediaAssetCreateSchema, input, MEDIA_VALIDATION_MESSAGE);
}
