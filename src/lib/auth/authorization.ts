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

type WriterSession = AuthenticatedSession & {
  user: AuthenticatedSession["user"] & {
    role: UserRole.WRITER;
  };
};

export function isAdminSession(session: Session | null | undefined): session is AdminSession {
  return session?.user?.role === UserRole.ADMIN;
}

export function isWriterSession(session: Session | null | undefined): session is WriterSession {
  return session?.user?.role === UserRole.WRITER;
}

export function canWritePosts(session: Session | null | undefined): boolean {
  return isAdminSession(session) || isWriterSession(session);
}

export function isAuthenticatedSession(
  session: Session | null | undefined
): session is AuthenticatedSession {
  return Boolean(session?.user?.id);
}
