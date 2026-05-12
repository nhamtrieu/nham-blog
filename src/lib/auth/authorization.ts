import type { Session } from "next-auth";

import { UserRole } from "@/entities/user.entity";

type AuthenticatedSession = Session & {
  user: Session["user"] & {
    id: string;
  };
};

type AdminSession = AuthenticatedSession & {
  user: AuthenticatedSession["user"] & {
    role: UserRole.ADMIN;
  };
};

export function isAdminSession(session: Session | null | undefined): session is AdminSession {
  return session?.user?.role === UserRole.ADMIN;
}

export function isAuthenticatedSession(
  session: Session | null | undefined
): session is AuthenticatedSession {
  return Boolean(session?.user?.id);
}
