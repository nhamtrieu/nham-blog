import bcrypt from "bcrypt";
import { ILike } from "typeorm";

import { initializeDataSource } from "@/db/data-source";
import { User, UserRole } from "@/entities/user.entity";
import {
  SERVICE_ERROR_CODES,
  ServiceError,
} from "@/services/service-error";
import type { ReaderRegisterInput } from "@/validators/reader-auth.validator";

type DataSourceFactory = typeof initializeDataSource;

export type ReaderAuthRecord = {
  id: string;
  email: string;
  name: string | null;
};

function mapReader(user: User): ReaderAuthRecord {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export function createReaderAuthService(dataSourceFactory: DataSourceFactory = initializeDataSource) {
  return {
    async registerReader(input: ReaderRegisterInput): Promise<ReaderAuthRecord> {
      const dataSource = await dataSourceFactory();
      const userRepository = dataSource.getRepository(User);
      const normalizedEmail = input.email.trim().toLowerCase();
      const existingUser = await userRepository.findOne({
        where: {
          email: ILike(normalizedEmail),
        },
      });

      if (existingUser) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.CONFLICT,
          message: "Email is already registered.",
          statusCode: 409,
          fields: {
            email: ["Email is already registered."],
          },
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const user = userRepository.create({
        email: normalizedEmail,
        name: input.name,
        passwordHash,
        role: UserRole.READER,
      });

      return mapReader(await userRepository.save(user));
    },
  };
}

export const readerAuthService = createReaderAuthService();
