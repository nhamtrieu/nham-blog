import { initializeDataSource } from "@/db/data-source";
import { Post } from "@/entities/post.entity";
import { PostLike } from "@/entities/post-like.entity";
import { PostSave } from "@/entities/post-save.entity";
import { publicVisibilityWhere } from "@/lib/post-publication";
import {
  SERVICE_ERROR_CODES,
  ServiceError,
} from "@/services/service-error";
import { notificationService } from "@/services/notification.service";

type DataSourceFactory = typeof initializeDataSource;

export type PostEngagementState = {
  likeCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
};

async function loadPublishedPostBySlug(
  dataSourceFactory: DataSourceFactory,
  slug: string
) {
  const dataSource = await dataSourceFactory();
  const post = await dataSource.getRepository(Post).findOne({
    where: {
      slug,
      ...publicVisibilityWhere(),
    },
    select: {
      id: true,
      slug: true,
      authorId: true,
    },
  });

  if (!post) {
    throw new ServiceError({
      code: SERVICE_ERROR_CODES.NOT_FOUND,
      message: "Post not found.",
      statusCode: 404,
    });
  }

  return post;
}

export function createPostEngagementService(
  dataSourceFactory: DataSourceFactory = initializeDataSource
) {
  return {
    async getEngagementForPostSlug(params: {
      slug: string;
      userId?: string | null;
    }): Promise<PostEngagementState> {
      const post = await loadPublishedPostBySlug(dataSourceFactory, params.slug);
      const dataSource = await dataSourceFactory();
      const likeRepository = dataSource.getRepository(PostLike);
      const saveRepository = dataSource.getRepository(PostSave);

      const [likeCount, likedByMe, savedByMe] = await Promise.all([
        likeRepository.count({ where: { postId: post.id } }),
        params.userId
          ? likeRepository.existsBy({ postId: post.id, userId: params.userId })
          : Promise.resolve(false),
        params.userId
          ? saveRepository.existsBy({ postId: post.id, userId: params.userId })
          : Promise.resolve(false),
      ]);

      return { likeCount, likedByMe, savedByMe };
    },

    async likePost(params: {
      slug: string;
      userId: string;
    }): Promise<PostEngagementState> {
      const post = await loadPublishedPostBySlug(dataSourceFactory, params.slug);
      const dataSource = await dataSourceFactory();
      const likeRepository = dataSource.getRepository(PostLike);
      const existing = await likeRepository.findOneBy({
        postId: post.id,
        userId: params.userId,
      });

      if (!existing) {
        await likeRepository.save(
          likeRepository.create({
            postId: post.id,
            userId: params.userId,
          })
        );

        if (post.authorId && post.authorId !== params.userId) {
          await notificationService.createPostLikeNotification({
            userId: post.authorId,
            actorId: params.userId,
            postId: post.id,
          });
        }
      }

      return this.getEngagementForPostSlug({
        slug: params.slug,
        userId: params.userId,
      });
    },

    async unlikePost(params: {
      slug: string;
      userId: string;
    }): Promise<PostEngagementState> {
      const post = await loadPublishedPostBySlug(dataSourceFactory, params.slug);
      const dataSource = await dataSourceFactory();
      const likeRepository = dataSource.getRepository(PostLike);
      const existing = await likeRepository.findOneBy({
        postId: post.id,
        userId: params.userId,
      });

      if (existing) {
        await likeRepository.delete({
          postId: post.id,
          userId: params.userId,
        });

        if (post.authorId) {
          await notificationService.deletePostLikeNotification({
            userId: post.authorId,
            actorId: params.userId,
            postId: post.id,
          });
        }
      }

      return this.getEngagementForPostSlug({
        slug: params.slug,
        userId: params.userId,
      });
    },

    async savePost(params: {
      slug: string;
      userId: string;
    }): Promise<PostEngagementState> {
      const post = await loadPublishedPostBySlug(dataSourceFactory, params.slug);
      const dataSource = await dataSourceFactory();
      const saveRepository = dataSource.getRepository(PostSave);
      const existing = await saveRepository.findOneBy({
        postId: post.id,
        userId: params.userId,
      });

      if (!existing) {
        await saveRepository.save(
          saveRepository.create({
            postId: post.id,
            userId: params.userId,
          })
        );
      }

      return this.getEngagementForPostSlug({
        slug: params.slug,
        userId: params.userId,
      });
    },

    async unsavePost(params: {
      slug: string;
      userId: string;
    }): Promise<PostEngagementState> {
      const post = await loadPublishedPostBySlug(dataSourceFactory, params.slug);
      const dataSource = await dataSourceFactory();

      await dataSource.getRepository(PostSave).delete({
        postId: post.id,
        userId: params.userId,
      });

      return this.getEngagementForPostSlug({
        slug: params.slug,
        userId: params.userId,
      });
    },
  };
}

export const postEngagementService = createPostEngagementService();
