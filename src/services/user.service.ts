import { initializeDataSource } from "@/db/data-source";
import { User, UserRole } from "@/entities/user.entity";
import {
  SERVICE_ERROR_CODES,
  ServiceError,
} from "@/services/service-error";

type DataSourceFactory = typeof initializeDataSource;

export const ASSIGNABLE_USER_ROLES = [UserRole.READER, UserRole.WRITER] as const;

export type AssignableUserRole = (typeof ASSIGNABLE_USER_ROLES)[number];

export type AdminUserListItem = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

function mapAdminUserListItem(user: User): AdminUserListItem {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function createUserService(dataSourceFactory: DataSourceFactory = initializeDataSource) {
  return {
    async listUsersForAdmin(): Promise<AdminUserListItem[]> {
      const dataSource = await dataSourceFactory();
      const users = await dataSource.getRepository(User).find({
        order: {
          createdAt: "DESC",
        },
      });

      return users.map(mapAdminUserListItem);
    },

    async updateAssignableRole(params: {
      userId: string;
      role: AssignableUserRole;
    }): Promise<AdminUserListItem> {
      const dataSource = await dataSourceFactory();
      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOneBy({ id: params.userId });

      if (!user) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "User not found.",
          statusCode: 404,
        });
      }

      if (user.role === UserRole.ADMIN) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.FORBIDDEN,
          message: "Cannot change ADMIN role via this API.",
          statusCode: 403,
        });
      }

      user.role = params.role;
      const saved = await userRepository.save(user);

      return mapAdminUserListItem(saved);
    },
  };
}

export const userService = createUserService();
