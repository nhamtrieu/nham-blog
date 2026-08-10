import { initializeDataSource } from "@/db/data-source";
import { EmailVerificationToken } from "@/entities/email-verification-token.entity";
import { User } from "@/entities/user.entity";
import { env } from "@/env";
import {
  emailVerificationExpiresAt,
  generateEmailVerificationRawToken,
  hashEmailVerificationToken,
} from "@/lib/auth/email-verification-token";
import { sendVerificationEmail } from "@/lib/email/send-verification-email";
import { publishVerificationEmail } from "@/lib/rabbitmq/email-verification-queue";
import {
  SERVICE_ERROR_CODES,
  ServiceError,
} from "@/services/service-error";

type DataSourceFactory = typeof initializeDataSource;

export type IssueVerificationResult = {
  queued: boolean;
  queueError?: string;
};

function buildVerifyUrl(rawToken: string) {
  const url = new URL("/api/readers/verify-email", env.APP_URL);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

export function createEmailVerificationService(
  dataSourceFactory: DataSourceFactory = initializeDataSource
) {
  return {
    async issueAndEnqueue(userId: string): Promise<IssueVerificationResult> {
      const dataSource = await dataSourceFactory();
      const userRepository = dataSource.getRepository(User);
      const tokenRepository = dataSource.getRepository(EmailVerificationToken);

      const user = await userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "User not found.",
          statusCode: 404,
        });
      }

      if (user.emailVerifiedAt) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.CONFLICT,
          message: "Email is already verified.",
          statusCode: 409,
        });
      }

      const rawToken = generateEmailVerificationRawToken();
      const tokenHash = hashEmailVerificationToken(rawToken);

      await tokenRepository.delete({ userId: user.id });
      await tokenRepository.save(
        tokenRepository.create({
          userId: user.id,
          tokenHash,
          expiresAt: emailVerificationExpiresAt(),
        })
      );

      const verifyUrl = buildVerifyUrl(rawToken);
      const payload = {
        type: "send_verification_email" as const,
        userId: user.id,
        email: user.email,
        name: user.name,
        verifyUrl,
      };

      try {
        // ponytail: no RABBITMQ_URL → send inline (local/dev). Ceiling: blocks the request;
        // upgrade: set RABBITMQ_URL + run `yarn worker:email`.
        if (!env.RABBITMQ_URL?.trim()) {
          await sendVerificationEmail({
            to: payload.email,
            name: payload.name,
            verifyUrl: payload.verifyUrl,
          });
          return { queued: true };
        }

        await publishVerificationEmail(payload);
        return { queued: true };
      } catch (error) {
        const queueError =
          error instanceof Error ? error.message : "Failed to enqueue verification email.";
        console.error("[email-verification] publish failed", error);
        return { queued: false, queueError };
      }
    },

    async verifyRawToken(rawToken: string): Promise<{ email: string }> {
      const normalized = rawToken.trim();

      if (!normalized) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "Verification link is invalid or expired.",
          statusCode: 404,
        });
      }

      const dataSource = await dataSourceFactory();
      const userRepository = dataSource.getRepository(User);
      const tokenRepository = dataSource.getRepository(EmailVerificationToken);
      const tokenHash = hashEmailVerificationToken(normalized);
      const token = await tokenRepository.findOne({ where: { tokenHash } });

      if (!token || token.expiresAt.getTime() <= Date.now()) {
        if (token) {
          await tokenRepository.delete({ id: token.id });
        }

        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "Verification link is invalid or expired.",
          statusCode: 404,
        });
      }

      const user = await userRepository.findOne({ where: { id: token.userId } });

      if (!user) {
        await tokenRepository.delete({ id: token.id });
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "Verification link is invalid or expired.",
          statusCode: 404,
        });
      }

      user.emailVerifiedAt = new Date();
      await userRepository.save(user);
      await tokenRepository.delete({ userId: user.id });

      return { email: user.email };
    },
  };
}

export const emailVerificationService = createEmailVerificationService();
