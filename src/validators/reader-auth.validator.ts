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
