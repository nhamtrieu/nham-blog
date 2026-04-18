import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      email: string;
      name: string | null;
    };
  }

  interface User extends DefaultUser {
    id: string;
    email: string;
    name: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}

export {};
