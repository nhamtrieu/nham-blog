import { z } from "zod";

import {
  type ValidationResult,
  validateWithSchema,
} from "@/validators/validation";

const ACCOUNT_PROFILE_VALIDATION_MESSAGE = "Account profile payload is invalid.";

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

const optionalUrlString = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value, ctx) => {
    if (!value || value.length === 0) {
      return null;
    }

    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

    try {
      new URL(withProtocol);
      return withProtocol;
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid URL.",
      });
      return z.NEVER;
    }
  });

export const accountProfileUpdateSchema = z.object({
  firstName: optionalTrimmedString(80),
  lastName: optionalTrimmedString(80),
  jobTitle: optionalTrimmedString(120),
  bio: optionalTrimmedString(2000),
  avatarUrl: optionalUrlString,
  links: z
    .object({
      twitter: optionalUrlString,
      facebook: optionalUrlString,
      tiktok: optionalUrlString,
      personal: optionalUrlString,
      github: optionalUrlString,
      youtube: optionalUrlString,
      linkedin: optionalUrlString,
    })
    .optional(),
});

export type AccountProfileUpdateInput = z.infer<typeof accountProfileUpdateSchema>;

export function validateAccountProfileUpdateInput(
  input: unknown
): ValidationResult<AccountProfileUpdateInput> {
  return validateWithSchema(
    accountProfileUpdateSchema,
    input,
    ACCOUNT_PROFILE_VALIDATION_MESSAGE
  );
}
