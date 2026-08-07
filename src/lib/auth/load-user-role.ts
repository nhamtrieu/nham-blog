import { withDataSource } from "@/db/data-source";
import { User, type UserRole } from "@/entities/user.entity";

/** Lightweight role lookup for JWT refresh — select only id + role. */
export async function loadUserRoleById(userId: string): Promise<UserRole | null> {
  return withDataSource(async (dataSource) => {
    const user = await dataSource.getRepository(User).findOne({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    return user?.role ?? null;
  });
}
