import bcrypt from "bcrypt";
import { ILike } from "typeorm";

import { initializeDataSource } from "@/db/data-source";
import { PasswordResetToken } from "@/entities/password-reset-token.entity";
import { User } from "@/entities/user.entity";
import { env } from "@/env";
import {
  generatePasswordResetRawToken,
  hashPasswordResetToken,
  passwordResetExpiresAt,
} from "@/lib/auth/password-reset-token";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset-email";
import { publishPasswordResetEmail } from "@/lib/rabbitmq/password-reset-queue";
import {
  SERVICE_ERROR_CODES,
  ServiceError,
} from "@/services/service-error";

type DataSourceFactory = typeof initializeDataSource;

const INVALID_RESET_MESSAGE = "Reset link is invalid or expired.";

function buildResetUrl(rawToken: string) {
  const url = new URL("/reset-password", env.APP_URL);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

export function createPasswordResetService(
  dataSourceFactory: DataSourceFactory = initializeDataSource
) {
  return {
    /** Always succeeds from the caller's perspective (no email enumeration). */
    async requestReset(email: string): Promise<void> {
      const dataSource = await dataSourceFactory();
      const userRepository = dataSource.getRepository(User);
      const tokenRepository = dataSource.getRepository(PasswordResetToken);
      const normalizedEmail = email.trim().toLowerCase();
      const user = await userRepository.findOne({
        where: {
          email: ILike(normalizedEmail),
        },
      });

      if (!user?.passwordHash) {
        return;
      }

      const rawToken = generatePasswordResetRawToken();
      const tokenHash = hashPasswordResetToken(rawToken);

      await tokenRepository.delete({ userId: user.id });
      await tokenRepository.save(
        tokenRepository.create({
          userId: user.id,
          tokenHash,
          expiresAt: passwordResetExpiresAt(),
        })
      );

      const resetUrl = buildResetUrl(rawToken);
      const payload = {
        type: "send_password_reset_email" as const,
        userId: user.id,
        email: user.email,
        name: user.name,
        resetUrl,
      };

      try {
        // ponytail: no RABBITMQ_URL → send inline (local/dev). Ceiling: blocks the request;
        // upgrade: set RABBITMQ_URL + run `yarn worker:email`.
        if (!env.RABBITMQ_URL?.trim()) {
          await sendPasswordResetEmail({
            to: payload.email,
            name: payload.name,
            resetUrl: payload.resetUrl,
          });
          return;
        }

        await publishPasswordResetEmail(payload);
      } catch (error) {
        console.error("[password-reset] publish failed", error);
      }
    },

    async resetWithRawToken(rawToken: string, password: string): Promise<void> {
      const normalized = rawToken.trim();

      if (!normalized) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: INVALID_RESET_MESSAGE,
          statusCode: 404,
        });
      }

      const dataSource = await dataSourceFactory();
      const userRepository = dataSource.getRepository(User);
      const tokenRepository = dataSource.getRepository(PasswordResetToken);
      const tokenHash = hashPasswordResetToken(normalized);
      const token = await tokenRepository.findOne({ where: { tokenHash } });

      if (!token || token.expiresAt.getTime() <= Date.now()) {
        if (token) {
          await tokenRepository.delete({ id: token.id });
        }

        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: INVALID_RESET_MESSAGE,
          statusCode: 404,
        });
      }

      const user = await userRepository.findOne({ where: { id: token.userId } });

      if (!user) {
        await tokenRepository.delete({ id: token.id });
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: INVALID_RESET_MESSAGE,
          statusCode: 404,
        });
      }

      user.passwordHash = await bcrypt.hash(password, 12);
      await userRepository.save(user);
      await tokenRepository.delete({ userId: user.id });
    },
  };
}

export const passwordResetService = createPasswordResetService();
