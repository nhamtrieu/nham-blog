import { z, type ZodError } from "zod";

export const VALIDATION_ERROR_CODE = "VALIDATION_ERROR";

export type ValidationErrorResponse = {
  code: typeof VALIDATION_ERROR_CODE;
  message: string;
  fields?: Record<string, string[]>;
};

export type ValidationSuccess<T> = {
  success: true;
  data: T;
};

export type ValidationFailure = {
  success: false;
  error: ValidationErrorResponse;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function formatZodError(
  error: ZodError,
  defaultMessage = "Validation failed."
): ValidationErrorResponse {
  const fields: Record<string, string[]> = {};
  const rootMessages: string[] = [];

  for (const issue of error.issues) {
    const path = issue.path.join(".");

    if (path.length === 0) {
      rootMessages.push(issue.message);
      continue;
    }

    if (!fields[path]) {
      fields[path] = [];
    }

    fields[path].push(issue.message);
  }

  const validationError: ValidationErrorResponse = {
    code: VALIDATION_ERROR_CODE,
    message: rootMessages[0] ?? defaultMessage,
  };

  if (Object.keys(fields).length > 0) {
    validationError.fields = fields;
  }

  return validationError;
}

export function validateWithSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
  defaultMessage?: string
): ValidationResult<z.infer<TSchema>> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: formatZodError(parsed.error, defaultMessage),
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}
