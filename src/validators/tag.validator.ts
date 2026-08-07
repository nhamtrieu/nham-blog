import { z } from "zod";

import { slugify } from "@/lib/slug";
import {
  type ValidationResult,
  validateWithSchema,
} from "@/validators/validation";

const TAG_VALIDATION_MESSAGE = "Dữ liệu tag không hợp lệ.";

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
  .min(1, "Tên tag là bắt buộc.")
  .max(120, "Tên tag tối đa 120 ký tự.");

const slugFieldSchema = z.preprocess(
  normalizeOptionalString,
  z
    .string()
    .max(160, "Slug tối đa 160 ký tự.")
    .refine((value) => /[a-zA-Z0-9]/.test(value), "Slug phải chứa chữ hoặc số.")
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
        message: "Cần ít nhất một trường để cập nhật tag.",
      });
    }
  });

export const tagReorderSchema = z.object({
  orderedIds: z
    .array(z.string().uuid("Mỗi id tag phải là UUID hợp lệ."))
    .min(1, "Danh sách thứ tự không được trống.")
    .refine((ids) => new Set(ids).size === ids.length, "Danh sách thứ tự không được trùng id."),
});

export type TagCreateInput = z.infer<typeof tagCreateSchema>;
export type TagUpdateInput = z.infer<typeof tagUpdateSchema>;
export type TagReorderInput = z.infer<typeof tagReorderSchema>;

export function validateTagCreateInput(input: unknown): ValidationResult<TagCreateInput> {
  return validateWithSchema(tagCreateSchema, input, TAG_VALIDATION_MESSAGE);
}

export function validateTagUpdateInput(input: unknown): ValidationResult<TagUpdateInput> {
  return validateWithSchema(tagUpdateSchema, input, TAG_VALIDATION_MESSAGE);
}

export function validateTagReorderInput(input: unknown): ValidationResult<TagReorderInput> {
  return validateWithSchema(tagReorderSchema, input, TAG_VALIDATION_MESSAGE);
}
