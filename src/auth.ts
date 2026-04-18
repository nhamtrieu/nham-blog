import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { env } from "@/env";
import { authenticateUserWithCredentials } from "@/lib/auth/authenticate-user";
import { ADMIN_LOGIN_PATH } from "@/lib/auth/auth-routes";
import {
  assertLoginRateLimit,
  clearFailedLoginAttempts,
  recordFailedLoginAttempt,
} from "@/lib/auth/login-rate-limit";
import { signInCredentialsSchema } from "@/lib/auth/sign-in-credentials";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;
const shouldUseSecureCookies = env.NEXTAUTH_URL.startsWith("https://");

export const authOptions = {
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: ADMIN_LOGIN_PATH,
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  useSecureCookies: shouldUseSecureCookies,
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "admin@nham.blog",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(rawCredentials, request) {
        const parsedCredentials = signInCredentialsSchema.safeParse(rawCredentials);

        if (!parsedCredentials.success) {
          return null;
        }

        assertLoginRateLimit(parsedCredentials.data.email, request);

        const user = await authenticateUserWithCredentials(parsedCredentials.data);

        if (!user) {
          recordFailedLoginAttempt(parsedCredentials.data.email, request);
          return null;
        }

        clearFailedLoginAttempts(parsedCredentials.data.email, request);

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.userId === "string") {
          session.user.id = token.userId;
        } else if (typeof token.sub === "string") {
          session.user.id = token.sub;
        }

        session.user.email =
          typeof token.email === "string" ? token.email : session.user.email ?? "";
        session.user.name =
          typeof token.name === "string" ? token.name : session.user.name ?? null;
      }

      return session;
    },
  },
} satisfies NextAuthOptions;

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
