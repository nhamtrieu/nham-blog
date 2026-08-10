import { ILike } from "typeorm";

import { initializeDataSource } from "@/db/data-source";
import { User, UserRole } from "@/entities/user.entity";
import type { AuthenticatedUser } from "@/lib/auth/authenticate-user";
import {
  decideGoogleReaderLink,
  prepareGoogleReaderIdentity,
  type GoogleReaderIdentity,
  type GoogleReaderProfileInput,
  type GoogleReaderResolveFailure,
} from "@/lib/auth/google-reader-link";

type DataSourceFactory = typeof initializeDataSource;

export type GoogleReaderResolveSuccess = {
  ok: true;
  user: AuthenticatedUser;
};

export type GoogleReaderResolveResult = GoogleReaderResolveFailure | GoogleReaderResolveSuccess;

function isGoogleReaderResolveFailure(
  value: GoogleReaderIdentity | GoogleReaderResolveFailure
): value is GoogleReaderResolveFailure {
  return "ok" in value && value.ok === false;
}

export function createGoogleAuthService(dataSourceFactory: DataSourceFactory = initializeDataSource) {
  return {
    async resolveGoogleReader(input: GoogleReaderProfileInput): Promise<GoogleReaderResolveResult> {
      const identityOrFailure = prepareGoogleReaderIdentity(input);

      if (isGoogleReaderResolveFailure(identityOrFailure)) {
        return identityOrFailure;
      }

      const identity = identityOrFailure;
      const dataSource = await dataSourceFactory();
      const userRepository = dataSource.getRepository(User);
      const existingUser = await userRepository.findOne({
        where: {
          email: ILike(identity.email),
        },
      });

      const decision = decideGoogleReaderLink(
        existingUser
          ? {
            role: existingUser.role,
            name: existingUser.name,
          }
          : null,
        identity
      );

      if ("ok" in decision) {
        return decision;
      }

      if (decision.action === "create") {
        const user = userRepository.create({
          email: identity.email,
          name: identity.name,
          passwordHash: null,
          role: UserRole.READER,
          emailVerifiedAt: new Date(),
        });
        const savedUser = await userRepository.save(user);

        return {
          ok: true,
          user: {
            id: savedUser.id,
            email: savedUser.email,
            name: savedUser.name,
            role: savedUser.role,
            avatarUrl: savedUser.avatarUrl,
            emailVerified: Boolean(savedUser.emailVerifiedAt),
            createdAt: savedUser.createdAt.toISOString(),
          },
        };
      }

      if (!existingUser) {
        return { ok: false, reason: "MISSING_EMAIL" };
      }

      if (decision.updateName) {
        existingUser.name = decision.updateName;
        await userRepository.save(existingUser);
      }

      // Google already verified the address — heal null for older linked accounts.
      if (!existingUser.emailVerifiedAt) {
        existingUser.emailVerifiedAt = new Date();
        await userRepository.save(existingUser);
      }

      return {
        ok: true,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role,
          avatarUrl: existingUser.avatarUrl,
          emailVerified: Boolean(existingUser.emailVerifiedAt),
          createdAt: existingUser.createdAt.toISOString(),
        },
      };
    },
  };
}

export const googleAuthService = createGoogleAuthService();
