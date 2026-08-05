import { z } from "zod";

import { UserRole } from "@/entities/user.entity";
import {
  type ValidationResult,
  validateWithSchema,
} from "@/validators/validation";

const updateAssignableRoleSchema = z.object({
  role: z.enum([UserRole.READER, UserRole.WRITER]),
});

export type UpdateAssignableRoleInput = z.infer<typeof updateAssignableRoleSchema>;

export function validateUpdateAssignableRoleInput(
  value: unknown
): ValidationResult<UpdateAssignableRoleInput> {
  return validateWithSchema(updateAssignableRoleSchema, value, "User role payload is invalid.");
}
