import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { env } from "@/env";
import { UserRole } from "@/entities/user.entity";
import { authenticateUserWithCredentials } from "@/lib/auth/authenticate-user";
import { ADMIN_LOGIN_PATH } from "@/lib/auth/auth-routes";
import { loadUserRoleById } from "@/lib/auth/load-user-role";
import {
  assertLoginRateLimit,
  clearFailedLoginAttempts,
  recordFailedLoginAttempt,
} from "@/lib/auth/login-rate-limit";
import { signInCredentialsSchema } from "@/lib/auth/sign-in-credentials";
import { googleAuthService } from "@/services/google-auth.service";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;
/** Refresh role from DB at most this often — not every request. */
const ROLE_SYNC_INTERVAL_MS = 30_000;
const shouldUseSecureCookies = env.NEXTAUTH_URL.startsWith("https://");
const hasGoogleOAuth = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

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
    ...(hasGoogleOAuth
      ? [
        GoogleProvider({
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
        }),
      ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      const emailVerified =
        profile && "email_verified" in profile
          ? Boolean(profile.email_verified)
          : undefined;

      const resolved = await googleAuthService.resolveGoogleReader({
        email: user.email,
        name: user.name,
        emailVerified,
      });

      if (!resolved.ok) {
        return false;
      }

      user.id = resolved.user.id;
      user.email = resolved.user.email;
      user.name = resolved.user.name;
      user.role = resolved.user.role;
      user.avatarUrl = resolved.user.avatarUrl;

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.avatarUrl = user.avatarUrl ?? null;
        token.roleSyncedAt = Date.now();
      }

      if (trigger === "update" && session) {
        if ("name" in session) {
          token.name = typeof session.name === "string" ? session.name : null;
        }

        if ("avatarUrl" in session) {
          token.avatarUrl =
            typeof session.avatarUrl === "string" ? session.avatarUrl : null;
        }
      }

      const userId = typeof token.userId === "string" ? token.userId : token.sub;
      const roleSyncedAt = typeof token.roleSyncedAt === "number" ? token.roleSyncedAt : 0;
      const shouldSyncRole =
        typeof userId === "string" && Date.now() - roleSyncedAt >= ROLE_SYNC_INTERVAL_MS;

      if (shouldSyncRole) {
        const role = await loadUserRoleById(userId);

        if (role) {
          token.role = role;
        }

        token.roleSyncedAt = Date.now();
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
        session.user.role = token.role ?? UserRole.READER;
        session.user.avatarUrl =
          typeof token.avatarUrl === "string" ? token.avatarUrl : null;
      }

      return session;
    },
  },
} satisfies NextAuthOptions;

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
