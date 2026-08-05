import { initializeDataSource } from "@/db/data-source";
import { User, type UserSocialLinks } from "@/entities/user.entity";
import {
  SERVICE_ERROR_CODES,
  ServiceError,
} from "@/services/service-error";
import type { AccountProfileUpdateInput } from "@/validators/account-profile.validator";

type DataSourceFactory = typeof initializeDataSource;

export type AccountProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  bio: string | null;
  name: string | null;
  avatarUrl: string | null;
  links: UserSocialLinks;
};

function compactSocialLinks(links: UserSocialLinks): UserSocialLinks {
  const next: UserSocialLinks = {};

  for (const key of [
    "twitter",
    "facebook",
    "tiktok",
    "personal",
    "github",
    "youtube",
    "linkedin",
  ] as const) {
    const value = links[key];
    if (value) {
      next[key] = value;
    }
  }

  return next;
}

function buildDisplayName(firstName: string | null, lastName: string | null) {
  const parts = [lastName, firstName].filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  return parts.join(" ").slice(0, 120);
}

function mapAccountProfile(user: User): AccountProfile {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    jobTitle: user.jobTitle,
    bio: user.bio,
    name: user.name,
    avatarUrl: user.avatarUrl,
    links: user.socialLinks ?? {},
  };
}

export function createAccountProfileService(
  dataSourceFactory: DataSourceFactory = initializeDataSource
) {
  return {
    async getProfile(userId: string): Promise<AccountProfile> {
      const dataSource = await dataSourceFactory();
      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOneBy({ id: userId });

      if (!user) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "User not found.",
          statusCode: 404,
        });
      }

      return mapAccountProfile(user);
    },

    async updateProfile(
      userId: string,
      input: AccountProfileUpdateInput
    ): Promise<AccountProfile> {
      const dataSource = await dataSourceFactory();
      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOneBy({ id: userId });

      if (!user) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "User not found.",
          statusCode: 404,
        });
      }

      const firstName = input.firstName ?? null;
      const lastName = input.lastName ?? null;

      user.firstName = firstName;
      user.lastName = lastName;
      user.jobTitle = input.jobTitle ?? null;
      user.bio = input.bio ?? null;
      user.avatarUrl = input.avatarUrl ?? null;
      user.socialLinks = compactSocialLinks({
        twitter: input.links?.twitter ?? undefined,
        facebook: input.links?.facebook ?? undefined,
        tiktok: input.links?.tiktok ?? undefined,
        personal: input.links?.personal ?? undefined,
        github: input.links?.github ?? undefined,
        youtube: input.links?.youtube ?? undefined,
        linkedin: input.links?.linkedin ?? undefined,
      });
      user.name = buildDisplayName(firstName, lastName);

      return mapAccountProfile(await userRepository.save(user));
    },
  };
}

export const accountProfileService = createAccountProfileService();
