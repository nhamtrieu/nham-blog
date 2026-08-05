import { z } from "zod";

import { CommentStatus } from "@/entities/comment.entity";
import {
  type ValidationResult,
  validateWithSchema,
} from "@/validators/validation";

const COMMENT_VALIDATION_MESSAGE = "Comment payload is invalid.";
const COMMENT_MAX_LENGTH = 2000;

export const commentCreateSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment content is required.")
    .max(COMMENT_MAX_LENGTH, `Comment content must be at most ${COMMENT_MAX_LENGTH} characters.`),
});

export const commentModerationSchema = z.object({
  status: z.enum([
    CommentStatus.APPROVED,
    CommentStatus.REJECTED,
    CommentStatus.SPAM,
  ]),
});

export const commentAdminListQuerySchema = z.object({
  status: z
    .enum([
      CommentStatus.PENDING,
      CommentStatus.APPROVED,
      CommentStatus.REJECTED,
      CommentStatus.SPAM,
    ])
    .optional(),
  search: z.string().trim().max(200).optional(),
});

export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
export type CommentUpdateInput = CommentCreateInput;
export type CommentModerationInput = z.infer<typeof commentModerationSchema>;
export type CommentAdminListQuery = z.infer<typeof commentAdminListQuerySchema>;

export function validateCommentCreateInput(input: unknown): ValidationResult<CommentCreateInput> {
  return validateWithSchema(commentCreateSchema, input, COMMENT_VALIDATION_MESSAGE);
}

export function validateCommentUpdateInput(input: unknown): ValidationResult<CommentUpdateInput> {
  return validateWithSchema(commentCreateSchema, input, COMMENT_VALIDATION_MESSAGE);
}

export function validateCommentModerationInput(
  input: unknown
): ValidationResult<CommentModerationInput> {
  return validateWithSchema(commentModerationSchema, input, COMMENT_VALIDATION_MESSAGE);
}

export function validateCommentAdminListQuery(
  input: unknown
): ValidationResult<CommentAdminListQuery> {
  return validateWithSchema(commentAdminListQuerySchema, input, COMMENT_VALIDATION_MESSAGE);
}
