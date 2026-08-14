import { z } from "zod";

import {
  type ValidationResult,
  validateWithSchema,
} from "@/validators/validation";

const READER_AUTH_VALIDATION_MESSAGE = "Reader auth payload is invalid.";

export const readerRegisterSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(120, "Name must be at most 120 characters."),
});

export type ReaderRegisterInput = z.infer<typeof readerRegisterSchema>;

export function validateReaderRegisterInput(
  input: unknown
): ValidationResult<ReaderRegisterInput> {
  return validateWithSchema(readerRegisterSchema, input, READER_AUTH_VALIDATION_MESSAGE);
}

export const readerForgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export type ReaderForgotPasswordInput = z.infer<typeof readerForgotPasswordSchema>;

export function validateReaderForgotPasswordInput(
  input: unknown
): ValidationResult<ReaderForgotPasswordInput> {
  return validateWithSchema(
    readerForgotPasswordSchema,
    input,
    READER_AUTH_VALIDATION_MESSAGE
  );
}

export const readerResetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Reset token is required."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
});

export type ReaderResetPasswordInput = z.infer<typeof readerResetPasswordSchema>;

export function validateReaderResetPasswordInput(
  input: unknown
): ValidationResult<ReaderResetPasswordInput> {
  return validateWithSchema(
    readerResetPasswordSchema,
    input,
    READER_AUTH_VALIDATION_MESSAGE
  );
}
