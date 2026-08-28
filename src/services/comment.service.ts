import {
  Brackets,
  Equal,
  LessThan,
} from "typeorm";

import { initializeDataSource } from "@/db/data-source";
import { Comment, CommentStatus } from "@/entities/comment.entity";
import { Post } from "@/entities/post.entity";
import { User, UserRole } from "@/entities/user.entity";
import { publicVisibilityWhere } from "@/lib/post-publication";
import {
  SERVICE_ERROR_CODES,
  ServiceError,
} from "@/services/service-error";
import { notificationService } from "@/services/notification.service";
import type {
  CommentAdminListQuery,
  CommentCreateInput,
  CommentModerationInput,
  CommentUpdateInput,
} from "@/validators/comment.validator";

type DataSourceFactory = typeof initializeDataSource;

export type PublicCommentItem = {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
  };
};

export type PublicCommentListResult = {
  items: PublicCommentItem[];
  pageInfo: {
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

export type AdminCommentItem = {
  id: string;
  content: string;
  status: CommentStatus;
  createdAt: Date;
  updatedAt: Date;
  moderatedAt: Date | null;
  author: {
    id: string;
    email: string;
    name: string | null;
  };
  post: {
    id: string;
    slug: string;
    title: string;
  };
};

export type AdminCommentListResult = {
  items: AdminCommentItem[];
  filteredCount: number;
  totalCount: number;
  statusCounts: Record<CommentStatus, number>;
  appliedFilters: {
    status: CommentStatus | null;
    search: string;
  };
};

const DEFAULT_PUBLIC_COMMENT_PAGE_SIZE = 20;
const MAX_PUBLIC_COMMENT_PAGE_SIZE = 50;
const MAX_COMMENT_DEPTH = 5;
const MAX_THREAD_COMMENTS = 200;

function normalizePageSize(limit: number | undefined) {
  if (!limit || !Number.isFinite(limit)) {
    return DEFAULT_PUBLIC_COMMENT_PAGE_SIZE;
  }

  const normalizedLimit = Math.floor(limit);

  if (normalizedLimit <= 0) {
    return DEFAULT_PUBLIC_COMMENT_PAGE_SIZE;
  }

  return Math.min(normalizedLimit, MAX_PUBLIC_COMMENT_PAGE_SIZE);
}

function parseCommentCursor(cursor: string | undefined) {
  if (!cursor) {
    return null;
  }

  const [rawCreatedAt, rawId, ...rest] = cursor.split("::");

  if (!rawCreatedAt || !rawId || rest.length > 0) {
    return null;
  }

  const createdAt = new Date(rawCreatedAt);

  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  return {
    createdAt,
    id: rawId,
  };
}

function createCommentCursor(comment: Pick<Comment, "id" | "createdAt">) {
  return `${comment.createdAt.toISOString()}::${comment.id}`;
}

function mapPublicComment(comment: Comment): PublicCommentItem {
  return {
    id: comment.id,
    parentId: comment.parentId,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: {
      id: comment.author.id,
      name: comment.author.name,
    },
  };
}

function mapAdminComment(comment: Comment): AdminCommentItem {
  return {
    id: comment.id,
    content: comment.content,
    status: comment.status,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    moderatedAt: comment.moderatedAt,
    author: {
      id: comment.author.id,
      email: comment.author.email,
      name: comment.author.name,
    },
    post: {
      id: comment.post.id,
      slug: comment.post.slug,
      title: comment.post.title,
    },
  };
}

async function loadPublishedPostBySlugOrThrow(manager: Awaited<ReturnType<DataSourceFactory>>["manager"], slug: string) {
  const postRepository = manager.getRepository(Post);
  const post = await postRepository.findOne({
    where: {
      slug,
      ...publicVisibilityWhere(),
    },
  });

  if (!post) {
    throw new ServiceError({
      code: SERVICE_ERROR_CODES.NOT_FOUND,
      message: "Published post not found.",
      statusCode: 404,
    });
  }

  return post;
}

async function assertAuthorExists(manager: Awaited<ReturnType<DataSourceFactory>>["manager"], authorId: string) {
  const userRepository = manager.getRepository(User);
  const authorExists = await userRepository.existsBy({ id: authorId });

  if (authorExists) {
    return;
  }

  throw new ServiceError({
    code: SERVICE_ERROR_CODES.INVALID_REFERENCE,
    message: "Author does not exist.",
    statusCode: 400,
    fields: {
      authorId: ["Author does not exist."],
    },
  });
}

async function assertAdminExists(manager: Awaited<ReturnType<DataSourceFactory>>["manager"], moderatorId: string) {
  const userRepository = manager.getRepository(User);
  const adminExists = await userRepository.existsBy({
    id: moderatorId,
    role: UserRole.ADMIN,
  });

  if (adminExists) {
    return;
  }

  throw new ServiceError({
    code: SERVICE_ERROR_CODES.INVALID_REFERENCE,
    message: "Moderator does not exist.",
    statusCode: 400,
    fields: {
      moderatorId: ["Moderator does not exist."],
    },
  });
}

async function getCommentDepth(
  manager: Awaited<ReturnType<DataSourceFactory>>["manager"],
  commentId: string
) {
  const commentRepository = manager.getRepository(Comment);
  let depth = 0;
  let currentId: string | null = commentId;

  while (currentId) {
    const current = await commentRepository.findOne({
      where: { id: currentId },
      select: {
        id: true,
        parentId: true,
      },
    });

    if (!current?.parentId) {
      break;
    }

    depth += 1;
    currentId = current.parentId;

    if (depth > MAX_COMMENT_DEPTH) {
      break;
    }
  }

  return depth;
}

async function resolveParentCommentOrThrow(
  manager: Awaited<ReturnType<DataSourceFactory>>["manager"],
  params: {
    parentId: string;
    postId: string;
  }
) {
  const commentRepository = manager.getRepository(Comment);
  const parent = await commentRepository.findOne({
    where: {
      id: params.parentId,
      postId: params.postId,
      status: CommentStatus.APPROVED,
    },
  });

  if (!parent) {
    throw new ServiceError({
      code: SERVICE_ERROR_CODES.INVALID_REFERENCE,
      message: "Parent comment not found.",
      statusCode: 400,
      fields: {
        parentId: ["Parent comment not found on this post."],
      },
    });
  }

  const parentDepth = await getCommentDepth(manager, parent.id);
  const nextDepth = parentDepth + 1;

  if (nextDepth > MAX_COMMENT_DEPTH) {
    throw new ServiceError({
      code: SERVICE_ERROR_CODES.CONFLICT,
      message: `Comment replies cannot exceed depth ${MAX_COMMENT_DEPTH}.`,
      statusCode: 400,
      fields: {
        parentId: [`Maximum reply depth is ${MAX_COMMENT_DEPTH}.`],
      },
    });
  }

  return parent;
}

export function createCommentService(dataSourceFactory: DataSourceFactory = initializeDataSource) {
  return {
    async listApprovedCommentsForPostSlug(params: {
      slug: string;
      cursor?: string;
      limit?: number;
    }): Promise<PublicCommentListResult> {
      const dataSource = await dataSourceFactory();
      const normalizedSlug = params.slug.trim();
      const post = await loadPublishedPostBySlugOrThrow(dataSource.manager, normalizedSlug);
      const commentRepository = dataSource.getRepository(Comment);

      // Load full thread (capped) so the UI can build a nested tree.
      if (!params.cursor) {
        const comments = await commentRepository.find({
          where: {
            postId: post.id,
            status: CommentStatus.APPROVED,
          },
          order: {
            createdAt: "ASC",
            id: "ASC",
          },
          relations: {
            author: true,
          },
          take: MAX_THREAD_COMMENTS,
        });

        return {
          items: comments.map(mapPublicComment),
          pageInfo: {
            hasNextPage: false,
            nextCursor: null,
          },
        };
      }

      const normalizedLimit = normalizePageSize(params.limit);
      const cursor = parseCommentCursor(params.cursor?.trim());
      const where = cursor
        ? [
          {
            postId: post.id,
            status: CommentStatus.APPROVED,
            createdAt: LessThan(cursor.createdAt),
          },
          {
            postId: post.id,
            status: CommentStatus.APPROVED,
            createdAt: Equal(cursor.createdAt),
            id: LessThan(cursor.id),
          },
        ]
        : {
          postId: post.id,
          status: CommentStatus.APPROVED,
        };
      const comments = await commentRepository.find({
        where,
        order: {
          createdAt: "DESC",
          id: "DESC",
        },
        relations: {
          author: true,
        },
        take: normalizedLimit + 1,
      });
      const hasNextPage = comments.length > normalizedLimit;
      const pageComments = comments.slice(0, normalizedLimit);

      return {
        items: pageComments.map(mapPublicComment),
        pageInfo: {
          hasNextPage,
          nextCursor: hasNextPage ? createCommentCursor(pageComments[pageComments.length - 1]) : null,
        },
      };
    },

    async createCommentForPostSlug(params: {
      slug: string;
      authorId: string;
      input: CommentCreateInput;
    }): Promise<PublicCommentItem> {
      const dataSource = await dataSourceFactory();

      const created = await dataSource.transaction(async (manager) => {
        const [post] = await Promise.all([
          loadPublishedPostBySlugOrThrow(manager, params.slug.trim()),
          assertAuthorExists(manager, params.authorId),
        ]);
        const parentId = params.input.parentId ?? null;
        const parent = parentId
          ? await resolveParentCommentOrThrow(manager, {
            parentId,
            postId: post.id,
          })
          : null;
        const commentRepository = manager.getRepository(Comment);
        const comment = commentRepository.create({
          postId: post.id,
          authorId: params.authorId,
          parentId: parent?.id ?? null,
          content: params.input.content,
          status: CommentStatus.APPROVED,
        });
        const savedComment = await commentRepository.save(comment);
        const loadedComment = await commentRepository.findOne({
          where: { id: savedComment.id },
          relations: {
            author: true,
          },
        });

        if (!loadedComment) {
          throw new ServiceError({
            code: SERVICE_ERROR_CODES.NOT_FOUND,
            message: "Comment not found.",
            statusCode: 404,
          });
        }

        return {
          comment: mapPublicComment(loadedComment),
          replyNotify:
            parent && parent.authorId !== params.authorId
              ? {
                userId: parent.authorId,
                actorId: params.authorId,
                postId: post.id,
                commentId: loadedComment.id,
                parentCommentId: parent.id,
              }
              : null,
          postNotify:
            !parent && post.authorId !== params.authorId
              ? {
                userId: post.authorId,
                actorId: params.authorId,
                postId: post.id,
                commentId: loadedComment.id,
              }
              : null,
        };
      });

      if (created.replyNotify) {
        await notificationService.createCommentReplyNotification(created.replyNotify);
      }

      if (created.postNotify) {
        await notificationService.createPostCommentNotification(created.postNotify);
      }

      return created.comment;
    },
    async listCommentsForAdmin(params: CommentAdminListQuery = {}): Promise<AdminCommentListResult> {
      const dataSource = await dataSourceFactory();
      const commentRepository = dataSource.getRepository(Comment);
      const normalizedSearch = params.search?.trim() ?? "";
      const normalizedStatus = params.status ?? null;
      const query = commentRepository
        .createQueryBuilder("comment")
        .leftJoinAndSelect("comment.author", "author")
        .leftJoinAndSelect("comment.post", "post")
        .orderBy("comment.createdAt", "DESC")
        .addOrderBy("comment.id", "DESC");

      if (normalizedStatus) {
        query.andWhere("comment.status = :status", { status: normalizedStatus });
      }

      if (normalizedSearch) {
        query.andWhere(
          new Brackets((builder) => {
            builder
              .where("comment.content ILIKE :search", { search: `%${normalizedSearch}%` })
              .orWhere("author.email ILIKE :search", { search: `%${normalizedSearch}%` })
              .orWhere("author.name ILIKE :search", { search: `%${normalizedSearch}%` })
              .orWhere("post.title ILIKE :search", { search: `%${normalizedSearch}%` });
          })
        );
      }

      const [
        comments,
        filteredCount,
        totalCount,
        pendingCount,
        approvedCount,
        rejectedCount,
        spamCount,
      ] = await Promise.all([
        query.getMany(),
        query.getCount(),
        commentRepository.count(),
        commentRepository.count({ where: { status: CommentStatus.PENDING } }),
        commentRepository.count({ where: { status: CommentStatus.APPROVED } }),
        commentRepository.count({ where: { status: CommentStatus.REJECTED } }),
        commentRepository.count({ where: { status: CommentStatus.SPAM } }),
      ]);

      return {
        items: comments.map(mapAdminComment),
        filteredCount,
        totalCount,
        statusCounts: {
          [CommentStatus.PENDING]: pendingCount,
          [CommentStatus.APPROVED]: approvedCount,
          [CommentStatus.REJECTED]: rejectedCount,
          [CommentStatus.SPAM]: spamCount,
        },
        appliedFilters: {
          status: normalizedStatus,
          search: normalizedSearch,
        },
      };
    },

    async moderateComment(params: {
      commentId: string;
      moderatorId: string;
      input: CommentModerationInput;
    }): Promise<AdminCommentItem> {
      const dataSource = await dataSourceFactory();

      return dataSource.transaction(async (manager) => {
        const commentRepository = manager.getRepository(Comment);
        const comment = await commentRepository.findOne({
          where: { id: params.commentId },
          relations: {
            author: true,
            post: true,
          },
        });

        if (!comment) {
          throw new ServiceError({
            code: SERVICE_ERROR_CODES.NOT_FOUND,
            message: "Comment not found.",
            statusCode: 404,
          });
        }

        await assertAdminExists(manager, params.moderatorId);

        comment.status = params.input.status;
        comment.moderatedById = params.moderatorId;
        comment.moderatedAt = new Date();

        return mapAdminComment(await commentRepository.save(comment));
      });
    },

    async deleteComment(commentId: string): Promise<void> {
      const dataSource = await dataSourceFactory();
      const commentRepository = dataSource.getRepository(Comment);
      const result = await commentRepository.delete({ id: commentId });

      if (result.affected && result.affected > 0) {
        return;
      }

      throw new ServiceError({
        code: SERVICE_ERROR_CODES.NOT_FOUND,
        message: "Comment not found.",
        statusCode: 404,
      });
    },

    async deleteOwnComment(params: { commentId: string; authorId: string }): Promise<void> {
      const dataSource = await dataSourceFactory();
      const commentRepository = dataSource.getRepository(Comment);
      const result = await commentRepository.delete({
        id: params.commentId,
        authorId: params.authorId,
      });

      if (result.affected && result.affected > 0) {
        return;
      }

      throw new ServiceError({
        code: SERVICE_ERROR_CODES.NOT_FOUND,
        message: "Comment not found.",
        statusCode: 404,
      });
    },

    async updateOwnComment(params: {
      commentId: string;
      authorId: string;
      input: CommentUpdateInput;
    }): Promise<PublicCommentItem> {
      const dataSource = await dataSourceFactory();
      const commentRepository = dataSource.getRepository(Comment);
      const comment = await commentRepository.findOne({
        where: {
          id: params.commentId,
          authorId: params.authorId,
        },
        relations: {
          author: true,
        },
      });

      if (!comment) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "Comment not found.",
          statusCode: 404,
        });
      }

      comment.content = params.input.content;
      const savedComment = await commentRepository.save(comment);

      return mapPublicComment(savedComment);
    },
  };
}

export const commentService = createCommentService();
