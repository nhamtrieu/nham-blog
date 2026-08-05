export const SERVICE_ERROR_CODES = {
  CONFLICT: "CONFLICT",
  FORBIDDEN: "FORBIDDEN",
  INVALID_REFERENCE: "INVALID_REFERENCE",
  NOT_FOUND: "NOT_FOUND",
} as const;

export type ServiceErrorCode =
  (typeof SERVICE_ERROR_CODES)[keyof typeof SERVICE_ERROR_CODES];

export type ServiceFieldErrors = Record<string, string[]>;

type ServiceErrorOptions = {
  code: ServiceErrorCode;
  message: string;
  statusCode: number;
  fields?: ServiceFieldErrors;
  cause?: unknown;
};

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly statusCode: number;
  readonly fields?: ServiceFieldErrors;

  constructor({ code, message, statusCode, fields, cause }: ServiceErrorOptions) {
    super(message, cause ? { cause } : undefined);

    this.name = "ServiceError";
    this.code = code;
    this.statusCode = statusCode;
    this.fields = fields;
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}
