import { initializeDataSource } from "@/db/data-source";
import { Post } from "@/entities/post.entity";
import { PostLike } from "@/entities/post-like.entity";
import { PostSave } from "@/entities/post-save.entity";
import { User } from "@/entities/user.entity";
import {
  applyPublicVisibilityToQueryBuilder,
  publicVisibilityWhere,
} from "@/lib/post-publication";
import {
  SERVICE_ERROR_CODES,
  ServiceError,
} from "@/services/service-error";

type DataSourceFactory = typeof initializeDataSource;

export type PublicAuthorProfile = {
  id: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  stats: {
    postCount: number;
    /** ponytail: series feature not in schema yet — always 0 until series lands */
    seriesCount: number;
    likeCount: number;
    saveCount: number;
  };
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createAuthorService(dataSourceFactory: DataSourceFactory = initializeDataSource) {
  return {
    async getPublicAuthorProfile(userId: string): Promise<PublicAuthorProfile> {
      const normalizedId = userId.trim();

      if (!UUID_RE.test(normalizedId)) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "Không tìm thấy tác giả.",
          statusCode: 404,
        });
      }

      const dataSource = await dataSourceFactory();
      const user = await dataSource.getRepository(User).findOne({
        where: { id: normalizedId },
        select: {
          id: true,
          name: true,
          bio: true,
          avatarUrl: true,
          jobTitle: true,
        },
      });

      if (!user) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "Không tìm thấy tác giả.",
          statusCode: 404,
        });
      }

      const postRepository = dataSource.getRepository(Post);
      const publishedWhere = {
        authorId: normalizedId,
        ...publicVisibilityWhere(),
      };

      const [postCount, likeCount, saveCount] = await Promise.all([
        postRepository.count({ where: publishedWhere }),
        applyPublicVisibilityToQueryBuilder(
          dataSource
            .getRepository(PostLike)
            .createQueryBuilder("like")
            .innerJoin("like.post", "post")
            .where("post.authorId = :authorId", { authorId: normalizedId }),
          "post"
        ).getCount(),
        applyPublicVisibilityToQueryBuilder(
          dataSource
            .getRepository(PostSave)
            .createQueryBuilder("save")
            .innerJoin("save.post", "post")
            .where("post.authorId = :authorId", { authorId: normalizedId }),
          "post"
        ).getCount(),
      ]);

      return {
        id: user.id,
        name: user.name,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        jobTitle: user.jobTitle,
        stats: {
          postCount,
          seriesCount: 0,
          likeCount,
          saveCount,
        },
      };
    },
  };
}

export const authorService = createAuthorService();
