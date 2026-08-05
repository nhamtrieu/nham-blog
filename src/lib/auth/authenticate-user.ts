import bcrypt from "bcrypt";
import { ILike } from "typeorm";

import { initializeDataSource } from "@/db/data-source";
import { User } from "@/entities";
import type { UserRole } from "@/entities/user.entity";
import type { SignInCredentials } from "@/lib/auth/sign-in-credentials";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  avatarUrl: string | null;
};

export async function authenticateUserWithCredentials(
  credentials: SignInCredentials
): Promise<AuthenticatedUser | null> {
  const normalizedEmail = credentials.email.trim().toLowerCase();
  const dataSource = await initializeDataSource();
  const userRepository = dataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: {
      email: ILike(normalizedEmail),
    },
  });

  if (!user?.passwordHash) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

  if (!isPasswordValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}
