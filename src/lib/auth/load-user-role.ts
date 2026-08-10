import { withDataSource } from "@/db/data-source";
import { User, type UserRole } from "@/entities/user.entity";

export type UserAuthSyncState = {
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
};

/** Lightweight auth fields for JWT refresh — select only what session needs. */
export async function loadUserAuthStateById(
  userId: string
): Promise<UserAuthSyncState | null> {
  return withDataSource(async (dataSource) => {
    const user = await dataSource.getRepository(User).findOne({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
      createdAt: user.createdAt.toISOString(),
    };
  });
}

/** @deprecated prefer loadUserAuthStateById */
export async function loadUserRoleById(userId: string): Promise<UserRole | null> {
  const state = await loadUserAuthStateById(userId);
  return state?.role ?? null;
}
