import { z } from "zod";

import { slugify } from "@/lib/slug";
import {
  type ValidationResult,
  validateWithSchema,
} from "@/validators/validation";

const TAG_VALIDATION_MESSAGE = "Tag payload is invalid.";

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

const nameFieldSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(120, "Name must be at most 120 characters.");

const slugFieldSchema = z.preprocess(
  normalizeOptionalString,
  z
    .string()
    .max(160, "Slug must be at most 160 characters.")
    .refine((value) => /[a-zA-Z0-9]/.test(value), "Slug must contain letters or numbers.")
    .transform((value) => slugify(value))
    .optional()
);

export const tagCreateSchema = z.object({
  name: nameFieldSchema,
  slug: slugFieldSchema,
});

export const tagUpdateSchema = z
  .object({
    name: nameFieldSchema.optional(),
    slug: slugFieldSchema,
  })
  .superRefine((data, context) => {
    const hasAtLeastOneField = Object.values(data).some((value) => value !== undefined);

    if (!hasAtLeastOneField) {
      context.addIssue({
        code: "custom",
        message: "Provide at least one field to update the tag.",
      });
    }
  });

export type TagCreateInput = z.infer<typeof tagCreateSchema>;
export type TagUpdateInput = z.infer<typeof tagUpdateSchema>;

export function validateTagCreateInput(input: unknown): ValidationResult<TagCreateInput> {
  return validateWithSchema(tagCreateSchema, input, TAG_VALIDATION_MESSAGE);
}

export function validateTagUpdateInput(input: unknown): ValidationResult<TagUpdateInput> {
  return validateWithSchema(tagUpdateSchema, input, TAG_VALIDATION_MESSAGE);
}
