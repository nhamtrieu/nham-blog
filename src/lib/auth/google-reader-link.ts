import { UserRole } from "@/entities/user.entity";

export type GoogleReaderProfileInput = {
  email?: string | null;
  name?: string | null;
  emailVerified?: boolean;
};

export type GoogleReaderIdentity = {
  email: string;
  name: string | null;
};

export type GoogleReaderResolveFailure = {
  ok: false;
  reason: "MISSING_EMAIL" | "EMAIL_NOT_VERIFIED" | "ADMIN_FORBIDDEN";
};

export function prepareGoogleReaderIdentity(
  input: GoogleReaderProfileInput
): GoogleReaderIdentity | GoogleReaderResolveFailure {
  const email = input.email?.trim().toLowerCase();

  if (!email) {
    return { ok: false, reason: "MISSING_EMAIL" };
  }

  if (input.emailVerified === false) {
    return { ok: false, reason: "EMAIL_NOT_VERIFIED" };
  }

  const name = input.name?.trim() || null;

  return {
    email,
    name: name && name.length > 0 ? name.slice(0, 120) : null,
  };
}

export function decideGoogleReaderLink(
  existing:
    | {
      role: UserRole;
      name: string | null;
    }
    | null,
  identity: GoogleReaderIdentity
):
  | { action: "create" }
  | { action: "reuse"; updateName: string | null }
  | GoogleReaderResolveFailure {
  if (!existing) {
    return { action: "create" };
  }

  if (existing.role === UserRole.ADMIN) {
    return { ok: false, reason: "ADMIN_FORBIDDEN" };
  }

  const updateName = !existing.name && identity.name ? identity.name : null;

  return { action: "reuse", updateName };
}
