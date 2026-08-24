import { z } from "zod";

import { PostStatus } from "@/entities/post.entity";
import { slugify } from "@/lib/slug";
import {
  type ValidationResult,
  validateWithSchema,
} from "@/validators/validation";

const POST_VALIDATION_MESSAGE = "Post payload is invalid.";

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

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

function normalizeOptionalDate(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      return null;
    }

    return new Date(trimmedValue);
  }

  return value;
}

const titleFieldSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(255, "Title must be at most 255 characters.");

const slugFieldSchema = z.preprocess(
  normalizeOptionalString,
  z
    .string()
    .max(255, "Slug must be at most 255 characters.")
    .refine((value) => /[a-zA-Z0-9]/.test(value), "Slug must contain letters or numbers.")
    .transform((value) => slugify(value))
    .optional()
);

const excerptFieldSchema = z.preprocess(
  normalizeNullableString,
  z
    .string()
    .max(500, "Excerpt must be at most 500 characters.")
    .nullable()
    .optional()
);

const contentMdxFieldSchema = z
  .string()
  .min(1, "Content is required.")
  .refine((value) => value.trim().length > 0, "Content is required.");

const coverImageUrlFieldSchema = z.preprocess(
  normalizeNullableString,
  z
    .url("Cover image URL must be a valid absolute URL.")
    .max(2048, "Cover image URL must be at most 2048 characters.")
    .nullable()
    .optional()
);

const seoTitleFieldSchema = z.preprocess(
  normalizeNullableString,
  z
    .string()
    .max(255, "SEO title must be at most 255 characters.")
    .nullable()
    .optional()
);

const seoDescriptionFieldSchema = z.preprocess(
  normalizeNullableString,
  z
    .string()
    .max(320, "SEO description must be at most 320 characters.")
    .nullable()
    .optional()
);

const publishedAtFieldSchema = z.preprocess(
  normalizeOptionalDate,
  z.date({ error: "Published date must be a valid date." }).nullable().optional()
);

const statusFieldSchema = z.nativeEnum(PostStatus).optional();

const sendNewsletterFieldSchema = z.boolean().optional();

const tagIdsFieldSchema = z
  .array(z.uuid("Each tag ID must be a valid UUID."))
  .refine((tagIds) => new Set(tagIds).size === tagIds.length, "Tag IDs must be unique.");

const createTagIdsFieldSchema = tagIdsFieldSchema.default([]);
const updateTagIdsFieldSchema = tagIdsFieldSchema.optional();

const postBaseShape = {
  title: titleFieldSchema,
  slug: slugFieldSchema,
  excerpt: excerptFieldSchema,
  contentMdx: contentMdxFieldSchema,
  coverImageUrl: coverImageUrlFieldSchema,
  status: statusFieldSchema,
  publishedAt: publishedAtFieldSchema,
  seoTitle: seoTitleFieldSchema,
  seoDescription: seoDescriptionFieldSchema,
  tagIds: createTagIdsFieldSchema,
  sendNewsletter: sendNewsletterFieldSchema,
} satisfies Record<string, z.ZodTypeAny>;

export const postCreateSchema = z
  .object(postBaseShape)
  .transform((data) => ({
    ...data,
    status: data.status ?? PostStatus.DRAFT,
    sendNewsletter: data.sendNewsletter ?? true,
  }))
  .superRefine((data, context) => {
    if (data.status === PostStatus.DRAFT && data.publishedAt) {
      context.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Draft posts cannot define a published date.",
      });
    }
  });

export const postUpdateSchema = z
  .object({
    title: titleFieldSchema.optional(),
    slug: slugFieldSchema,
    excerpt: excerptFieldSchema,
    contentMdx: contentMdxFieldSchema.optional(),
    coverImageUrl: coverImageUrlFieldSchema,
    status: statusFieldSchema,
    publishedAt: publishedAtFieldSchema,
    seoTitle: seoTitleFieldSchema,
    seoDescription: seoDescriptionFieldSchema,
    tagIds: updateTagIdsFieldSchema,
    sendNewsletter: sendNewsletterFieldSchema,
  })
  .superRefine((data, context) => {
    const hasAtLeastOneField = Object.values(data).some((value) => value !== undefined);

    if (!hasAtLeastOneField) {
      context.addIssue({
        code: "custom",
        message: "Provide at least one field to update the post.",
      });
    }

    if (data.status === PostStatus.DRAFT && data.publishedAt) {
      context.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Draft posts cannot define a published date.",
      });
    }
  });

export type PostCreateInput = z.infer<typeof postCreateSchema>;
export type PostUpdateInput = z.infer<typeof postUpdateSchema>;

export function validatePostCreateInput(input: unknown): ValidationResult<PostCreateInput> {
  return validateWithSchema(postCreateSchema, input, POST_VALIDATION_MESSAGE);
}

export function validatePostUpdateInput(input: unknown): ValidationResult<PostUpdateInput> {
  return validateWithSchema(postUpdateSchema, input, POST_VALIDATION_MESSAGE);
}
