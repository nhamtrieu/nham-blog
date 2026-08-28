import { In, LessThanOrEqual, type ObjectLiteral, type SelectQueryBuilder } from "typeorm";

import { PostStatus } from "@/entities/post.entity";
import { cosineSimilarity } from "@/lib/embedding";

export const PUBLIC_VISIBLE_STATUSES = [
  PostStatus.PUBLISHED,
  PostStatus.SCHEDULED,
] as const;

export type PublicationState = {
  status: PostStatus;
  publishedAt: Date | null;
};

export type PublicationInput = {
  status?: PostStatus;
  publishedAt?: Date | null;
};

export function isPostPubliclyVisible(
  post: { status: PostStatus; publishedAt: Date | null },
  now: Date = new Date()
): boolean {
  if (!post.publishedAt) {
    return false;
  }

  if (
    post.status !== PostStatus.PUBLISHED &&
    post.status !== PostStatus.SCHEDULED
  ) {
    return false;
  }

  return post.publishedAt.getTime() <= now.getTime();
}

/** TypeORM find `where` for posts that should appear on the public site. */
export function publicVisibilityWhere(now: Date = new Date()) {
  return {
    status: In([...PUBLIC_VISIBLE_STATUSES]),
    publishedAt: LessThanOrEqual(now),
  };
}

export function applyPublicVisibilityToQueryBuilder<Entity extends ObjectLiteral>(
  query: SelectQueryBuilder<Entity>,
  alias = "post",
  now: Date = new Date()
) {
  return query
    .andWhere(`${alias}.status IN (:...publicStatuses)`, {
      publicStatuses: [...PUBLIC_VISIBLE_STATUSES],
    })
    .andWhere(`${alias}.publishedAt IS NOT NULL`)
    .andWhere(`${alias}.publishedAt <= :publicNow`, { publicNow: now });
}

export function resolveCreatePublicationState(
  status: PostStatus,
  publishedAt?: Date | null,
  now: Date = new Date()
): PublicationState {
  if (status === PostStatus.DRAFT) {
    return {
      status: PostStatus.DRAFT,
      publishedAt: null,
    };
  }

  if (status === PostStatus.SCHEDULED) {
    if (!publishedAt || publishedAt.getTime() <= now.getTime()) {
      return {
        status: PostStatus.PUBLISHED,
        publishedAt: publishedAt && publishedAt.getTime() <= now.getTime() ? publishedAt : now,
      };
    }

    return {
      status: PostStatus.SCHEDULED,
      publishedAt,
    };
  }

  const date = publishedAt ?? now;

  if (date.getTime() > now.getTime()) {
    return {
      status: PostStatus.SCHEDULED,
      publishedAt: date,
    };
  }

  return {
    status: PostStatus.PUBLISHED,
    publishedAt: date,
  };
}

export function resolveUpdatePublicationState(
  post: { status: PostStatus; publishedAt: Date | null },
  input: PublicationInput,
  now: Date = new Date()
): PublicationState {
  const targetStatus = input.status ?? post.status;
  const hasPublishedAtUpdate = Object.prototype.hasOwnProperty.call(input, "publishedAt");

  if (targetStatus === PostStatus.DRAFT) {
    return {
      status: PostStatus.DRAFT,
      publishedAt: null,
    };
  }

  const nextPublishedAt = hasPublishedAtUpdate
    ? (input.publishedAt ?? null)
    : post.publishedAt;

  if (targetStatus === PostStatus.SCHEDULED) {
    if (!nextPublishedAt || nextPublishedAt.getTime() <= now.getTime()) {
      return {
        status: PostStatus.PUBLISHED,
        publishedAt: nextPublishedAt ?? now,
      };
    }

    return {
      status: PostStatus.SCHEDULED,
      publishedAt: nextPublishedAt,
    };
  }

  const date = nextPublishedAt ?? now;

  if (date.getTime() > now.getTime()) {
    return {
      status: PostStatus.SCHEDULED,
      publishedAt: date,
    };
  }

  return {
    status: PostStatus.PUBLISHED,
    publishedAt: date,
  };
}

export type RelatedPostCandidate = {
  id: string;
  tagIds: string[];
  publishedAt: Date;
  embedding?: number[] | null;
};

function pickRelatedPostIdsByTags(params: {
  candidates: RelatedPostCandidate[];
  sourceTagIds: string[];
  excludeIds: Set<string>;
  limit: number;
}): string[] {
  const sourceSet = new Set(params.sourceTagIds);
  const scored = params.candidates
    .filter((candidate) => !params.excludeIds.has(candidate.id))
    .map((candidate) => ({
      id: candidate.id,
      overlap: candidate.tagIds.reduce(
        (count, tagId) => count + (sourceSet.has(tagId) ? 1 : 0),
        0
      ),
      publishedAtMs: candidate.publishedAt.getTime(),
    }))
    .sort((left, right) => {
      if (right.overlap !== left.overlap) {
        return right.overlap - left.overlap;
      }

      return right.publishedAtMs - left.publishedAtMs;
    });

  const withOverlap = scored.filter((item) => item.overlap > 0).slice(0, params.limit);

  if (withOverlap.length >= params.limit) {
    return withOverlap.map((item) => item.id);
  }

  const picked = new Set(withOverlap.map((item) => item.id));
  const fallback = scored
    .filter((item) => !picked.has(item.id))
    .slice(0, params.limit - withOverlap.length);

  return [...withOverlap, ...fallback].map((item) => item.id);
}

function pickRelatedPostIdsByCosine(params: {
  candidates: RelatedPostCandidate[];
  sourceEmbedding: number[];
  excludeId: string;
  limit: number;
}): string[] {
  return params.candidates
    .filter(
      (candidate) =>
        candidate.id !== params.excludeId &&
        Array.isArray(candidate.embedding) &&
        candidate.embedding.length === params.sourceEmbedding.length
    )
    .map((candidate) => ({
      id: candidate.id,
      score: cosineSimilarity(params.sourceEmbedding, candidate.embedding ?? []),
      publishedAtMs: candidate.publishedAt.getTime(),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.publishedAtMs - left.publishedAtMs;
    })
    .slice(0, params.limit)
    .map((item) => item.id);
}

/**
 * Prefer cosine similarity of embeddings; fill leftover slots with tag overlap / recency.
 */
export function pickRelatedPostIds(params: {
  candidates: RelatedPostCandidate[];
  sourceTagIds: string[];
  sourceEmbedding?: number[] | null;
  excludeId: string;
  limit: number;
}): string[] {
  const limit = Math.max(0, Math.floor(params.limit));

  if (limit === 0) {
    return [];
  }

  const cosineIds =
    params.sourceEmbedding && params.sourceEmbedding.length > 0
      ? pickRelatedPostIdsByCosine({
          candidates: params.candidates,
          sourceEmbedding: params.sourceEmbedding,
          excludeId: params.excludeId,
          limit,
        })
      : [];

  if (cosineIds.length >= limit) {
    return cosineIds;
  }

  const tagIds = pickRelatedPostIdsByTags({
    candidates: params.candidates,
    sourceTagIds: params.sourceTagIds,
    excludeIds: new Set([params.excludeId, ...cosineIds]),
    limit: limit - cosineIds.length,
  });

  return [...cosineIds, ...tagIds];
}
