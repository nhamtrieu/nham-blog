import { Equal, IsNull, LessThan } from "typeorm";

import { initializeDataSource } from "@/db/data-source";
import { Notification, NotificationType } from "@/entities/notification.entity";
import {
  publishNotificationEvent,
  type NotificationRealtimePayload,
} from "@/lib/realtime/notification-bus";
import {
  SERVICE_ERROR_CODES,
  ServiceError,
} from "@/services/service-error";

type DataSourceFactory = typeof initializeDataSource;

export type NotificationListItem = {
  id: string;
  type: NotificationType;
  readAt: Date | null;
  createdAt: Date;
  actor: {
    id: string;
    name: string | null;
  };
  post: {
    id: string;
    slug: string;
    title: string;
  };
  commentId: string;
  parentCommentId: string | null;
};

export type NotificationListResult = {
  items: NotificationListItem[];
  pageInfo: {
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function normalizePageSize(limit: number | undefined) {
  if (!limit || !Number.isFinite(limit)) {
    return DEFAULT_PAGE_SIZE;
  }

  const normalized = Math.floor(limit);

  if (normalized <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(normalized, MAX_PAGE_SIZE);
}

function parseCursor(cursor: string | undefined) {
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

  return { createdAt, id: rawId };
}

function createCursor(item: Pick<Notification, "id" | "createdAt">) {
  return `${item.createdAt.toISOString()}::${item.id}`;
}

function mapNotification(notification: Notification): NotificationListItem {
  return {
    id: notification.id,
    type: notification.type,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    actor: {
      id: notification.actor.id,
      name: notification.actor.name,
    },
    post: {
      id: notification.post.id,
      slug: notification.post.slug,
      title: notification.post.title,
    },
    commentId: notification.commentId,
    parentCommentId: notification.parentCommentId,
  };
}

function toRealtimePayload(notification: Notification): NotificationRealtimePayload {
  return {
    id: notification.id,
    type: notification.type,
    userId: notification.userId,
    actorId: notification.actorId,
    actorName: notification.actor.name,
    postId: notification.postId,
    postSlug: notification.post.slug,
    commentId: notification.commentId,
    parentCommentId: notification.parentCommentId,
    createdAt: notification.createdAt.toISOString(),
  };
}

async function createAndPublishNotification(
  dataSourceFactory: DataSourceFactory,
  params: {
    userId: string;
    actorId: string;
    type: NotificationType;
    postId: string;
    commentId: string;
    parentCommentId: string | null;
  }
): Promise<NotificationListItem | null> {
  if (params.userId === params.actorId) {
    return null;
  }

  const dataSource = await dataSourceFactory();
  const repository = dataSource.getRepository(Notification);
  const notification = repository.create({
    userId: params.userId,
    actorId: params.actorId,
    type: params.type,
    postId: params.postId,
    commentId: params.commentId,
    parentCommentId: params.parentCommentId,
    readAt: null,
  });
  const saved = await repository.save(notification);
  const loaded = await repository.findOne({
    where: { id: saved.id },
    relations: {
      actor: true,
      post: true,
    },
  });

  if (!loaded) {
    return null;
  }

  await publishNotificationEvent(toRealtimePayload(loaded));

  return mapNotification(loaded);
}

export function createNotificationService(
  dataSourceFactory: DataSourceFactory = initializeDataSource
) {
  return {
    async createCommentReplyNotification(params: {
      userId: string;
      actorId: string;
      postId: string;
      commentId: string;
      parentCommentId: string;
    }): Promise<NotificationListItem | null> {
      return createAndPublishNotification(dataSourceFactory, {
        ...params,
        type: NotificationType.COMMENT_REPLY,
      });
    },

    async createPostCommentNotification(params: {
      userId: string;
      actorId: string;
      postId: string;
      commentId: string;
    }): Promise<NotificationListItem | null> {
      return createAndPublishNotification(dataSourceFactory, {
        ...params,
        type: NotificationType.POST_COMMENT,
        parentCommentId: null,
      });
    },

    async listForUser(params: {
      userId: string;
      cursor?: string;
      limit?: number;
    }): Promise<NotificationListResult> {
      const dataSource = await dataSourceFactory();
      const repository = dataSource.getRepository(Notification);
      const limit = normalizePageSize(params.limit);
      const cursor = parseCursor(params.cursor?.trim());
      const where = cursor
        ? [
          {
            userId: params.userId,
            createdAt: LessThan(cursor.createdAt),
          },
          {
            userId: params.userId,
            createdAt: Equal(cursor.createdAt),
            id: LessThan(cursor.id),
          },
        ]
        : { userId: params.userId };

      const rows = await repository.find({
        where,
        order: {
          createdAt: "DESC",
          id: "DESC",
        },
        relations: {
          actor: true,
          post: true,
        },
        take: limit + 1,
      });
      const hasNextPage = rows.length > limit;
      const pageRows = rows.slice(0, limit);

      return {
        items: pageRows.map(mapNotification),
        pageInfo: {
          hasNextPage,
          nextCursor: hasNextPage ? createCursor(pageRows[pageRows.length - 1]) : null,
        },
      };
    },

    async countUnread(userId: string): Promise<number> {
      const dataSource = await dataSourceFactory();

      return dataSource.getRepository(Notification).count({
        where: {
          userId,
          readAt: IsNull(),
        },
      });
    },

    async markRead(params: { userId: string; notificationId: string }): Promise<NotificationListItem> {
      const dataSource = await dataSourceFactory();
      const repository = dataSource.getRepository(Notification);
      const notification = await repository.findOne({
        where: {
          id: params.notificationId,
          userId: params.userId,
        },
        relations: {
          actor: true,
          post: true,
        },
      });

      if (!notification) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "Notification not found.",
          statusCode: 404,
        });
      }

      if (!notification.readAt) {
        notification.readAt = new Date();
        await repository.save(notification);
      }

      return mapNotification(notification);
    },

    async markAllRead(userId: string): Promise<{ updatedCount: number }> {
      const dataSource = await dataSourceFactory();
      const result = await dataSource.getRepository(Notification).update(
        {
          userId,
          readAt: IsNull(),
        },
        {
          readAt: new Date(),
        }
      );

      return {
        updatedCount: result.affected ?? 0,
      };
    },
  };
}

export const notificationService = createNotificationService();
