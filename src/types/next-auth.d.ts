import type { DefaultSession, DefaultUser } from "next-auth";

import type { UserRole } from "@/entities/user.entity";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      email: string;
      name: string | null;
      role: UserRole;
    };
  }

  interface User extends DefaultUser {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
  }
}

export {};
