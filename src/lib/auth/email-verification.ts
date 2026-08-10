export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_GRACE_MS = 24 * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_QUEUE = "email.verification";

export type EmailVerificationSessionUser = {
  role?: string;
  emailVerified?: boolean;
  createdAt?: string | null;
};

export function isEmailVerified(user: EmailVerificationSessionUser | null | undefined) {
  return Boolean(user?.emailVerified);
}

/** Admins skip verification UX and feature locks. */
export function needsVerificationBanner(user: EmailVerificationSessionUser | null | undefined) {
  if (!user || user.role === "ADMIN") {
    return false;
  }

  return !isEmailVerified(user);
}

export function isVerificationGraceExpired(
  user: EmailVerificationSessionUser | null | undefined,
  now = Date.now()
) {
  if (!needsVerificationBanner(user)) {
    return false;
  }

  if (!user?.createdAt) {
    return false;
  }

  const createdAtMs = Date.parse(user.createdAt);

  if (Number.isNaN(createdAtMs)) {
    return false;
  }

  return now - createdAtMs >= EMAIL_VERIFICATION_GRACE_MS;
}
