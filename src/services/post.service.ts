import {
  Brackets,
  Equal,
  ILike,
  In,
  LessThan,
  Like,
  type DataSource,
  type EntityManager,
} from "typeorm";

import { initializeDataSource, withDataSource } from "@/db/data-source";
import { Post, PostStatus } from "@/entities/post.entity";
import { PostTag } from "@/entities/post-tag.entity";
import { Tag } from "@/entities/tag.entity";
import { User } from "@/entities/user.entity";
import { buildPostEmbeddingInput, embedText } from "@/lib/embedding";
import {
  applyPublicVisibilityToQueryBuilder,
  pickRelatedPostIds,
  publicVisibilityWhere,
  resolveCreatePublicationState,
  resolveUpdatePublicationState,
} from "@/lib/post-publication";
import { calculateReadingTimeFromMdx, extractReadableTextFromMdx } from "@/lib/reading-time";
import { createUniqueSlug, slugify } from "@/lib/slug";
import {
  SERVICE_ERROR_CODES,
  ServiceError,
} from "@/services/service-error";
import type { PostCreateInput, PostUpdateInput } from "@/validators/post.validator";

type DataSourceFactory = typeof initializeDataSource;

type NewsletterEnqueue = (postId: string) => Promise<unknown>;

async function maybeEnqueueNewsletter(options: {
  shouldSend: boolean;
  becamePublished: boolean;
  postId: string;
  enqueue?: NewsletterEnqueue;
}) {
  if (!options.shouldSend || !options.becamePublished) {
    return;
  }

  try {
    const enqueue =
      options.enqueue ??
      (async (postId: string) => {
        const { newsletterService } = await import("@/services/newsletter.service");
        return newsletterService.enqueueIssueForPost(postId);
      });
    await enqueue(options.postId);
  } catch (error) {
    // Publish must succeed even if newsletter fails.
    console.error("[newsletter] enqueue after publish failed", error);
  }
}

async function runWithDataSource<T>(
  factory: DataSourceFactory,
  fn: (dataSource: DataSource) => Promise<T>
): Promise<T> {
  if (factory === initializeDataSource) {
    return withDataSource(fn);
  }

  return fn(await factory());
}

type PostTagSummary = {
  id: string;
  name: string;
  slug: string;
};

export type PostAuthorSummary = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

export type PostRecord = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentMdx: string;
  coverImageUrl: string | null;
  status: PostStatus;
  publishedAt: Date | null;
  readingTime: number;
  seoTitle: string | null;
  seoDescription: string | null;
  authorId: string;
  author: PostAuthorSummary | null;
  createdAt: Date;
  updatedAt: Date;
  tagIds: string[];
  tags: PostTagSummary[];
};

export type PostListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  status: PostStatus;
  publishedAt: Date | null;
  readingTime: number;
  updatedAt: Date;
  createdAt: Date;
  tags: PostTagSummary[];
};

export type PostListResult = {
  items: PostListItem[];
  filteredCount: number;
  totalCount: number;
  statusCounts: {
    draft: number;
    scheduled: number;
    published: number;
  };
  appliedFilters: {
    search: string;
    status: PostStatus | null;
  };
};

type CreatePostParams = {
  authorId: string;
  input: PostCreateInput;
};

type UpdatePostParams = {
  postId: string;
  input: PostUpdateInput;
};

type ListPostsParams = {
  search?: string;
  status?: PostStatus;
  authorId?: string;
};

type ListPublishedPostsParams = {
  cursor?: string;
  limit?: number;
  search?: string;
  authorId?: string;
};

type ListPublishedPostsForTagParams = {
  tagId: string;
  cursor?: string;
  limit?: number;
  authorId?: string;
};

export type PublishedPostListResult = {
  items: PostListItem[];
  pageInfo: {
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

export type PublishedSitemapEntry = {
  slug: string;
  updatedAt: Date;
};

export type PublishedRssEntry = {
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: Date;
  updatedAt: Date;
};

const DEFAULT_PUBLISHED_POST_PAGE_SIZE = 6;
const MAX_PUBLISHED_POST_PAGE_SIZE = 24;
const DEFAULT_RSS_ITEM_LIMIT = 30;
const MAX_RSS_ITEM_LIMIT = 100;
const DEFAULT_RELATED_POST_LIMIT = 3;
const MAX_RELATED_POST_LIMIT = 6;
/** ponytail: in-memory related ranking; ceiling ~small blog. Upgrade: pgvector ANN. */
const RELATED_CANDIDATE_POOL_SIZE = 100;

function isPublicFacingStatus(status: PostStatus) {
  return status === PostStatus.PUBLISHED || status === PostStatus.SCHEDULED;
}

async function persistPostEmbedding(
  factory: DataSourceFactory,
  post: Pick<Post, "id" | "title" | "excerpt" | "contentMdx" | "status">
) {
  if (!isPublicFacingStatus(post.status)) {
    return false;
  }

  const embedding = await embedText(
    buildPostEmbeddingInput({
      title: post.title,
      excerpt: post.excerpt,
      contentText: extractReadableTextFromMdx(post.contentMdx),
    })
  );

  if (!embedding) {
    return false;
  }

  await runWithDataSource(factory, async (dataSource) => {
    await dataSource.getRepository(Post).update({ id: post.id }, { embedding });
  });

  return true;
}

function mapTagSummary(tag: Tag): PostTagSummary {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
  };
}

function mapAuthorSummary(author: User | null | undefined): PostAuthorSummary | null {
  if (!author) {
    return null;
  }

  return {
    id: author.id,
    name: author.name,
    avatarUrl: author.avatarUrl,
  };
}

function sortTagsByOrder(tags: Tag[]) {
  return [...tags].sort((leftTag, rightTag) => {
    if (leftTag.orderNumber !== rightTag.orderNumber) {
      return leftTag.orderNumber - rightTag.orderNumber;
    }

    return leftTag.name.localeCompare(rightTag.name, "vi", { sensitivity: "base" });
  });
}

function mapPostRecord(post: Post) {
  const tags = sortTagsByOrder(
    (post.postTags ?? [])
      .map((postTag) => postTag.tag)
      .filter((tag): tag is Tag => Boolean(tag))
  ).map(mapTagSummary);

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    contentMdx: post.contentMdx,
    coverImageUrl: post.coverImageUrl,
    status: post.status,
    publishedAt: post.publishedAt,
    readingTime: post.readingTime,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    authorId: post.authorId,
    author: mapAuthorSummary(post.author),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    tagIds: tags.map((tag) => tag.id),
    tags,
  } satisfies PostRecord;
}

function mapPostListItem(post: Post) {
  const tags = sortTagsByOrder(
    (post.postTags ?? [])
      .map((postTag) => postTag.tag)
      .filter((tag): tag is Tag => Boolean(tag))
  ).map(mapTagSummary);

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl,
    status: post.status,
    publishedAt: post.publishedAt,
    readingTime: post.readingTime,
    updatedAt: post.updatedAt,
    createdAt: post.createdAt,
    tags,
  } satisfies PostListItem;
}

function normalizePublishedPostsPageSize(limit: number | undefined) {
  if (!limit || !Number.isFinite(limit)) {
    return DEFAULT_PUBLISHED_POST_PAGE_SIZE;
  }

  const normalizedLimit = Math.floor(limit);

  if (normalizedLimit <= 0) {
    return DEFAULT_PUBLISHED_POST_PAGE_SIZE;
  }

  return Math.min(normalizedLimit, MAX_PUBLISHED_POST_PAGE_SIZE);
}

function normalizeRssItemLimit(limit: number | undefined) {
  if (!limit || !Number.isFinite(limit)) {
    return DEFAULT_RSS_ITEM_LIMIT;
  }

  const normalizedLimit = Math.floor(limit);

  if (normalizedLimit <= 0) {
    return DEFAULT_RSS_ITEM_LIMIT;
  }

  return Math.min(normalizedLimit, MAX_RSS_ITEM_LIMIT);
}

function parsePublishedPostsCursor(cursor: string | undefined) {
  if (!cursor) {
    return null;
  }

  const [rawPublishedAt, rawId, ...rest] = cursor.split("::");

  if (!rawPublishedAt || !rawId || rest.length > 0) {
    return null;
  }

  const publishedAt = new Date(rawPublishedAt);

  if (Number.isNaN(publishedAt.getTime())) {
    return null;
  }

  return {
    id: rawId,
    publishedAt,
  };
}

function createPublishedPostsCursor(post: Pick<Post, "id" | "publishedAt">) {
  if (!post.publishedAt) {
    return null;
  }

  return `${post.publishedAt.toISOString()}::${post.id}`;
}

function normalizeRelatedPostsLimit(limit: number | undefined) {
  if (!limit || !Number.isFinite(limit)) {
    return DEFAULT_RELATED_POST_LIMIT;
  }

  const normalizedLimit = Math.floor(limit);

  if (normalizedLimit <= 0) {
    return DEFAULT_RELATED_POST_LIMIT;
  }

  return Math.min(normalizedLimit, MAX_RELATED_POST_LIMIT);
}

async function loadPostRecordOrThrow(manager: EntityManager, postId: string) {
  const postRepository = manager.getRepository(Post);
  const post = await postRepository.findOne({
    where: { id: postId },
    relations: {
      author: true,
      postTags: {
        tag: true,
      },
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

async function loadPublishedPostRecordBySlugOrThrow(manager: EntityManager, slug: string) {
  const postRepository = manager.getRepository(Post);
  const post = await postRepository.findOne({
    where: {
      slug,
      ...publicVisibilityWhere(),
    },
    relations: {
      author: true,
      postTags: {
        tag: true,
      },
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

async function assertAuthorExists(manager: EntityManager, authorId: string) {
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

async function loadTagsByIdsOrThrow(manager: EntityManager, tagIds: string[]) {
  if (tagIds.length === 0) {
    return [];
  }

  const tagRepository = manager.getRepository(Tag);
  const tags = await tagRepository.findBy({
    id: In(tagIds),
  });

  if (tags.length === tagIds.length) {
    const tagById = new Map(tags.map((tag) => [tag.id, tag]));
    return tagIds.map((tagId) => tagById.get(tagId)).filter((tag): tag is Tag => Boolean(tag));
  }

  const foundTagIds = new Set(tags.map((tag) => tag.id));
  const missingTagIds = tagIds.filter((tagId) => !foundTagIds.has(tagId));

  throw new ServiceError({
    code: SERVICE_ERROR_CODES.INVALID_REFERENCE,
    message: "Some selected tags do not exist.",
    statusCode: 400,
    fields: {
      tagIds: [`Unknown tag IDs: ${missingTagIds.join(", ")}`],
    },
  });
}

async function resolveUniquePostSlug(
  manager: EntityManager,
  slugSource: string,
  currentSlug?: string | null
) {
  const postRepository = manager.getRepository(Post);
  const baseSlug = slugify(slugSource);
  const baseCandidates = await postRepository.find({
    select: {
      slug: true,
    },
    where: [
      { slug: baseSlug },
      { slug: Like(`${baseSlug}-%`) },
    ],
  });

  return createUniqueSlug(
    slugSource,
    baseCandidates.map((post) => post.slug),
    { currentSlug }
  );
}

async function replacePostTags(manager: EntityManager, postId: string, tags: Tag[]) {
  const postTagRepository = manager.getRepository(PostTag);

  await postTagRepository.delete({ postId });

  if (tags.length === 0) {
    return;
  }

  await postTagRepository.save(
    tags.map((tag) =>
      postTagRepository.create({
        postId,
        tagId: tag.id,
      })
    )
  );
}

export function createPostService(
  dataSourceFactory: DataSourceFactory = initializeDataSource,
  newsletterEnqueue?: NewsletterEnqueue
) {
  return {
    async getPost(postId: string): Promise<PostRecord> {
      const dataSource = await dataSourceFactory();

      return mapPostRecord(await loadPostRecordOrThrow(dataSource.manager, postId));
    },

    async getPostForAuthor(postId: string, authorId: string): Promise<PostRecord> {
      const post = await this.getPost(postId);

      if (post.authorId !== authorId) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "Post not found.",
          statusCode: 404,
        });
      }

      return post;
    },

    async getPublishedPostBySlug(slug: string): Promise<PostRecord> {
      const normalizedSlug = slug.trim();

      if (normalizedSlug.length === 0) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "Published post not found.",
          statusCode: 404,
        });
      }

      return runWithDataSource(dataSourceFactory, async (dataSource) =>
        mapPostRecord(
          await loadPublishedPostRecordBySlugOrThrow(dataSource.manager, normalizedSlug)
        )
      );
    },

    async listPosts(params: ListPostsParams = {}): Promise<PostListResult> {
      const dataSource = await dataSourceFactory();
      const postRepository = dataSource.getRepository(Post);
      const normalizedSearch = params.search?.trim() ?? "";
      const normalizedStatus = params.status ?? null;
      const authorId = params.authorId?.trim() || null;
      const where = {
        ...(normalizedSearch
          ? {
            title: ILike(`%${normalizedSearch}%`),
          }
          : {}),
        ...(normalizedStatus
          ? {
            status: normalizedStatus,
          }
          : {}),
        ...(authorId
          ? {
            authorId,
          }
          : {}),
      };
      const authorScope = authorId ? { authorId } : {};

      const [posts, filteredCount, totalCount, draftCount, scheduledCount, publishedCount] =
        await Promise.all([
          postRepository.find({
            where,
            order: {
              updatedAt: "DESC",
              createdAt: "DESC",
            },
            relations: {
              postTags: {
                tag: true,
              },
            },
          }),
          postRepository.count({
            where,
          }),
          postRepository.count({
            where: authorScope,
          }),
          postRepository.count({
            where: {
              status: PostStatus.DRAFT,
              ...authorScope,
            },
          }),
          postRepository.count({
            where: {
              status: PostStatus.SCHEDULED,
              ...authorScope,
            },
          }),
          postRepository.count({
            where: {
              status: PostStatus.PUBLISHED,
              ...authorScope,
            },
          }),
        ]);

      return {
        items: posts.map(mapPostListItem),
        filteredCount,
        totalCount,
        statusCounts: {
          draft: draftCount,
          scheduled: scheduledCount,
          published: publishedCount,
        },
        appliedFilters: {
          search: normalizedSearch,
          status: normalizedStatus,
        },
      };
    },

    async listPublishedPosts(
      params: ListPublishedPostsParams = {}
    ): Promise<PublishedPostListResult> {
      const dataSource = await dataSourceFactory();
      const postRepository = dataSource.getRepository(Post);
      const normalizedLimit = normalizePublishedPostsPageSize(params.limit);
      const cursor = parsePublishedPostsCursor(params.cursor?.trim());
      const normalizedSearch = params.search?.trim() ?? "";
      const authorId = params.authorId?.trim() || null;
      const authorFilter = authorId ? { authorId } : {};
      const searchFilter = normalizedSearch
        ? {
          title: ILike(`%${normalizedSearch}%`),
        }
        : {};
      const visibility = publicVisibilityWhere();
      const where = cursor
        ? [
          {
            ...visibility,
            publishedAt: LessThan(cursor.publishedAt),
            ...searchFilter,
            ...authorFilter,
          },
          {
            ...visibility,
            publishedAt: Equal(cursor.publishedAt),
            id: LessThan(cursor.id),
            ...searchFilter,
            ...authorFilter,
          },
        ]
        : {
          ...visibility,
          ...searchFilter,
          ...authorFilter,
        };
      const cursorCandidates = await postRepository.find({
        select: {
          id: true,
          publishedAt: true,
        },
        where,
        order: {
          publishedAt: "DESC",
          id: "DESC",
        },
        take: normalizedLimit + 1,
      });
      const hasNextPage = cursorCandidates.length > normalizedLimit;
      const pageCandidates = cursorCandidates.slice(0, normalizedLimit);

      if (pageCandidates.length === 0) {
        return {
          items: [],
          pageInfo: {
            hasNextPage: false,
            nextCursor: null,
          },
        };
      }

      const pagePostIds = pageCandidates.map((post) => post.id);
      const posts = await postRepository.find({
        where: {
          id: In(pagePostIds),
          ...visibility,
        },
        relations: {
          postTags: {
            tag: true,
          },
        },
      });
      const postById = new Map(posts.map((post) => [post.id, post]));
      const orderedPosts = pagePostIds
        .map((postId) => postById.get(postId))
        .filter((post): post is Post => Boolean(post));
      const nextCursor =
        hasNextPage && pageCandidates.length > 0
          ? createPublishedPostsCursor(pageCandidates[pageCandidates.length - 1])
          : null;

      return {
        items: orderedPosts.map(mapPostListItem),
        pageInfo: {
          hasNextPage,
          nextCursor,
        },
      };
    },

    async listPublishedPostsForTag(
      params: ListPublishedPostsForTagParams
    ): Promise<PublishedPostListResult> {
      const dataSource = await dataSourceFactory();
      const postRepository = dataSource.getRepository(Post);
      const normalizedLimit = normalizePublishedPostsPageSize(params.limit);
      const cursor = parsePublishedPostsCursor(params.cursor?.trim());
      const visibility = publicVisibilityWhere();

      const query = applyPublicVisibilityToQueryBuilder(
        postRepository
          .createQueryBuilder("post")
          .innerJoin("post.postTags", "postTag")
          .where("postTag.tagId = :tagId", { tagId: params.tagId }),
        "post"
      );

      if (params.authorId?.trim()) {
        query.andWhere("post.authorId = :authorId", { authorId: params.authorId.trim() });
      }

      if (cursor) {
        query.andWhere(
          new Brackets((qb) => {
            qb.where("post.publishedAt < :cursorPublishedAt", {
              cursorPublishedAt: cursor.publishedAt,
            }).orWhere(
              "(post.publishedAt = :cursorPublishedAtEqual AND post.id < :cursorId)",
              {
                cursorPublishedAtEqual: cursor.publishedAt,
                cursorId: cursor.id,
              }
            );
          })
        );
      }

      const cursorCandidates = await query
        .select(["post.id", "post.publishedAt"])
        .orderBy("post.publishedAt", "DESC")
        .addOrderBy("post.id", "DESC")
        .take(normalizedLimit + 1)
        .getMany();

      const hasNextPage = cursorCandidates.length > normalizedLimit;
      const pageCandidates = cursorCandidates.slice(0, normalizedLimit);

      if (pageCandidates.length === 0) {
        return {
          items: [],
          pageInfo: {
            hasNextPage: false,
            nextCursor: null,
          },
        };
      }

      const pagePostIds = pageCandidates.map((post) => post.id);
      const posts = await postRepository.find({
        where: {
          id: In(pagePostIds),
          ...visibility,
        },
        relations: {
          postTags: {
            tag: true,
          },
        },
      });
      const postById = new Map(posts.map((post) => [post.id, post]));
      const orderedPosts = pagePostIds
        .map((postId) => postById.get(postId))
        .filter((post): post is Post => Boolean(post));
      const nextCursor =
        hasNextPage && pageCandidates.length > 0
          ? createPublishedPostsCursor(pageCandidates[pageCandidates.length - 1])
          : null;

      return {
        items: orderedPosts.map(mapPostListItem),
        pageInfo: {
          hasNextPage,
          nextCursor,
        },
      };
    },

    async listPublishedPostsForSitemap(): Promise<PublishedSitemapEntry[]> {
      const dataSource = await dataSourceFactory();
      const postRepository = dataSource.getRepository(Post);
      const posts = await postRepository.find({
        where: publicVisibilityWhere(),
        select: {
          slug: true,
          updatedAt: true,
        },
        order: {
          updatedAt: "DESC",
        },
      });

      return posts.map((post) => ({
        slug: post.slug,
        updatedAt: post.updatedAt,
      }));
    },

    async listPublishedPostsForRss(options: { limit?: number } = {}): Promise<PublishedRssEntry[]> {
      const dataSource = await dataSourceFactory();
      const postRepository = dataSource.getRepository(Post);
      const take = normalizeRssItemLimit(options.limit);
      const posts = await postRepository.find({
        where: publicVisibilityWhere(),
        select: {
          title: true,
          slug: true,
          excerpt: true,
          publishedAt: true,
          updatedAt: true,
        },
        order: {
          publishedAt: "DESC",
          id: "DESC",
        },
        take,
      });

      return posts.map((post) => ({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        publishedAt: post.publishedAt as Date,
        updatedAt: post.updatedAt,
      }));
    },

    async listRelatedPosts(params: {
      postId: string;
      limit?: number;
    }): Promise<PostListItem[]> {
      const normalizedLimit = normalizeRelatedPostsLimit(params.limit);

      return runWithDataSource(dataSourceFactory, async (dataSource) => {
        const postRepository = dataSource.getRepository(Post);
        const sourcePost = await postRepository.findOne({
          where: { id: params.postId },
          relations: {
            postTags: true,
          },
        });

        if (!sourcePost) {
          throw new ServiceError({
            code: SERVICE_ERROR_CODES.NOT_FOUND,
            message: "Post not found.",
            statusCode: 404,
          });
        }

        const candidates = await postRepository.find({
          where: publicVisibilityWhere(),
          relations: {
            postTags: {
              tag: true,
            },
          },
          order: {
            publishedAt: "DESC",
            id: "DESC",
          },
          take: RELATED_CANDIDATE_POOL_SIZE,
        });

        const relatedIds = pickRelatedPostIds({
          candidates: candidates.map((post) => ({
            id: post.id,
            tagIds: (post.postTags ?? []).map((postTag) => postTag.tagId),
            publishedAt: post.publishedAt as Date,
            embedding: post.embedding,
          })),
          sourceTagIds: (sourcePost.postTags ?? []).map((postTag) => postTag.tagId),
          sourceEmbedding: sourcePost.embedding,
          excludeId: sourcePost.id,
          limit: normalizedLimit,
        });

        const postById = new Map(candidates.map((post) => [post.id, post]));

        return relatedIds
          .map((postId) => postById.get(postId))
          .filter((post): post is Post => Boolean(post))
          .map(mapPostListItem);
      });
    },

    async promoteDueScheduledPosts(now: Date = new Date()): Promise<number> {
      return runWithDataSource(dataSourceFactory, async (dataSource) => {
        const result = await dataSource
          .createQueryBuilder()
          .update(Post)
          .set({ status: PostStatus.PUBLISHED })
          .where("status = :status", { status: PostStatus.SCHEDULED })
          .andWhere("published_at <= :now", { now })
          .execute();

        return result.affected ?? 0;
      });
    },
    async createPost({ authorId, input }: CreatePostParams): Promise<PostRecord> {
      const dataSource = await dataSourceFactory();

      const record = await dataSource.transaction(async (manager) => {
        await assertAuthorExists(manager, authorId);

        const tags = await loadTagsByIdsOrThrow(manager, input.tagIds);
        const slug = await resolveUniquePostSlug(manager, input.slug ?? input.title);
        const publication = resolveCreatePublicationState(input.status, input.publishedAt);
        const postRepository = manager.getRepository(Post);

        const post = postRepository.create({
          title: input.title,
          slug,
          excerpt: input.excerpt ?? null,
          contentMdx: input.contentMdx,
          coverImageUrl: input.coverImageUrl ?? null,
          status: publication.status,
          publishedAt: publication.publishedAt,
          readingTime: calculateReadingTimeFromMdx(input.contentMdx),
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
          authorId,
        });

        const savedPost = await postRepository.save(post);

        await replacePostTags(manager, savedPost.id, tags);

        return mapPostRecord(await loadPostRecordOrThrow(manager, savedPost.id));
      });

      await persistPostEmbedding(dataSourceFactory, record);

      await maybeEnqueueNewsletter({
        shouldSend: input.sendNewsletter !== false,
        becamePublished: record.status === PostStatus.PUBLISHED,
        postId: record.id,
        enqueue: newsletterEnqueue,
      });

      return record;
    },

    async updatePost({ postId, input }: UpdatePostParams): Promise<PostRecord> {
      const dataSource = await dataSourceFactory();

      const { record, shouldRefreshEmbedding, becamePublished } = await dataSource.transaction(
        async (manager) => {
          const postRepository = manager.getRepository(Post);
          const existingPost = await loadPostRecordOrThrow(manager, postId);
          const wasPublished = existingPost.status === PostStatus.PUBLISHED;
          const tags =
            input.tagIds === undefined
              ? null
              : await loadTagsByIdsOrThrow(manager, input.tagIds);
          const publication = resolveUpdatePublicationState(existingPost, input);
          const slug =
            input.slug === undefined
              ? existingPost.slug
              : await resolveUniquePostSlug(manager, input.slug, existingPost.slug);
          const textChanged =
            input.title !== undefined ||
            input.excerpt !== undefined ||
            input.contentMdx !== undefined;
          const becamePublic =
            isPublicFacingStatus(publication.status) &&
            !isPublicFacingStatus(existingPost.status);

          const updatedPost = postRepository.merge(existingPost, {
            title: input.title ?? existingPost.title,
            slug,
            excerpt: input.excerpt === undefined ? existingPost.excerpt : input.excerpt,
            contentMdx: input.contentMdx ?? existingPost.contentMdx,
            coverImageUrl:
              input.coverImageUrl === undefined
                ? existingPost.coverImageUrl
                : input.coverImageUrl,
            status: publication.status,
            publishedAt: publication.publishedAt,
            readingTime:
              input.contentMdx === undefined
                ? existingPost.readingTime
                : calculateReadingTimeFromMdx(input.contentMdx),
            seoTitle: input.seoTitle === undefined ? existingPost.seoTitle : input.seoTitle,
            seoDescription:
              input.seoDescription === undefined
                ? existingPost.seoDescription
                : input.seoDescription,
          });

          await postRepository.save(updatedPost);

          if (tags) {
            await replacePostTags(manager, postId, tags);
          }

          const mapped = mapPostRecord(await loadPostRecordOrThrow(manager, postId));

          return {
            record: mapped,
            shouldRefreshEmbedding:
              isPublicFacingStatus(publication.status) &&
              (becamePublic || textChanged || !existingPost.embedding),
            becamePublished: !wasPublished && mapped.status === PostStatus.PUBLISHED,
          };
        }
      );

      if (shouldRefreshEmbedding) {
        await persistPostEmbedding(dataSourceFactory, record);
      }

      await maybeEnqueueNewsletter({
        shouldSend: input.sendNewsletter !== false,
        becamePublished,
        postId: record.id,
        enqueue: newsletterEnqueue,
      });

      return record;
    },

    async deletePost(postId: string): Promise<void> {
      const dataSource = await dataSourceFactory();

      await dataSource.transaction(async (manager) => {
        await loadPostRecordOrThrow(manager, postId);
        await manager.getRepository(Post).delete({ id: postId });
      });
    },

    async deletePostForAuthor(postId: string, authorId: string): Promise<void> {
      await this.getPostForAuthor(postId, authorId);
      await this.deletePost(postId);
    },

    async syncPublicPostEmbeddings(): Promise<{ updated: number; skipped: number }> {
      return runWithDataSource(dataSourceFactory, async (dataSource) => {
        const posts = await dataSource.getRepository(Post).find({
          where: {
            status: In([PostStatus.PUBLISHED, PostStatus.SCHEDULED]),
          },
          select: {
            id: true,
            title: true,
            excerpt: true,
            contentMdx: true,
            status: true,
            embedding: true,
          },
        });

        let updated = 0;
        let skipped = 0;

        for (const post of posts) {
          const didUpdate = await persistPostEmbedding(dataSourceFactory, post);

          if (didUpdate) {
            updated += 1;
          } else {
            skipped += 1;
          }
        }

        return { updated, skipped };
      });
    },
  };
}

export const postService = createPostService();
