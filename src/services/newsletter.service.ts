import { ILike, type DataSource } from "typeorm";

import { initializeDataSource, withDataSource } from "@/db/data-source";
import {
  NewsletterDelivery,
  NewsletterDeliveryStatus,
} from "@/entities/newsletter-delivery.entity";
import {
  NewsletterIssue,
  NewsletterIssueStatus,
} from "@/entities/newsletter-issue.entity";
import {
  NewsletterSubscriber,
  NewsletterSubscriberStatus,
} from "@/entities/newsletter-subscriber.entity";
import { Post, PostStatus } from "@/entities/post.entity";
import { env } from "@/env";
import { sendNewsletterConfirmEmail } from "@/lib/email/send-newsletter-confirm-email";
import { sendNewsletterIssueEmail } from "@/lib/email/send-newsletter-issue-email";
import { NEWSLETTER_DELIVERY_CHUNK_SIZE } from "@/lib/newsletter/constants";
import {
  createUnsubscribeToken,
  generateNewsletterRawToken,
  generateUnsubscribeSalt,
  hashNewsletterToken,
  newsletterConfirmExpiresAt,
  parseUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/newsletter/tokens";
import {
  publishNewsletterConfirm,
  publishNewsletterIssue,
} from "@/lib/rabbitmq/newsletter-queue";
import {
  SERVICE_ERROR_CODES,
  ServiceError,
} from "@/services/service-error";

type DataSourceFactory = typeof initializeDataSource;

const GENERIC_SUBSCRIBE_MESSAGE =
  "Nếu email hợp lệ, chúng tôi đã gửi link xác nhận. Kiểm tra hộp thư (và spam).";
const INVALID_CONFIRM_MESSAGE = "Link xác nhận không hợp lệ hoặc đã hết hạn.";
const INVALID_UNSUBSCRIBE_MESSAGE = "Link hủy đăng ký không hợp lệ.";

async function runWithDataSource<T>(
  factory: DataSourceFactory,
  fn: (dataSource: DataSource) => Promise<T>
): Promise<T> {
  if (factory === initializeDataSource) {
    return withDataSource(fn);
  }

  return fn(await factory());
}

function buildConfirmUrl(rawToken: string) {
  const url = new URL("/newsletter/confirm", env.APP_URL);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

function buildUnsubscribeUrl(rawToken: string) {
  const url = new URL("/newsletter/unsubscribe", env.APP_URL);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

function buildPostUrl(slug: string) {
  return new URL(`/blog/${slug}`, env.APP_URL).toString();
}

function mapSubscriber(subscriber: NewsletterSubscriber) {
  return {
    id: subscriber.id,
    email: subscriber.email,
    userId: subscriber.userId,
    status: subscriber.status,
    source: subscriber.source,
    confirmedAt: subscriber.confirmedAt,
    unsubscribedAt: subscriber.unsubscribedAt,
    createdAt: subscriber.createdAt,
    updatedAt: subscriber.updatedAt,
  };
}

function mapIssue(issue: NewsletterIssue, post?: Post | null) {
  return {
    id: issue.id,
    postId: issue.postId,
    subject: issue.subject,
    status: issue.status,
    scheduledAt: issue.scheduledAt,
    startedAt: issue.startedAt,
    finishedAt: issue.finishedAt,
    totalRecipients: issue.totalRecipients,
    sentCount: issue.sentCount,
    failedCount: issue.failedCount,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    post: post
      ? {
          id: post.id,
          title: post.title,
          slug: post.slug,
        }
      : null,
  };
}

async function enqueueConfirmEmail(payload: {
  subscriberId: string;
  email: string;
  confirmUrl: string;
}) {
  const message = {
    type: "newsletter.confirm" as const,
    ...payload,
  };

  try {
    // ponytail: no RABBITMQ_URL → send inline (local/dev).
    if (!env.RABBITMQ_URL?.trim()) {
      await sendNewsletterConfirmEmail({
        to: payload.email,
        confirmUrl: payload.confirmUrl,
      });
      return;
    }

    await publishNewsletterConfirm(message);
  } catch (error) {
    console.error("[newsletter] confirm publish failed", error);
  }
}

async function enqueueIssue(issueId: string) {
  const message = {
    type: "newsletter.issue" as const,
    issueId,
  };

  try {
    if (!env.RABBITMQ_URL?.trim()) {
      // Inline path handled by caller via processIssue when no RabbitMQ.
      return { queued: false as const };
    }

    await publishNewsletterIssue(message);
    return { queued: true as const };
  } catch (error) {
    console.error("[newsletter] issue publish failed", error);
    return { queued: false as const, error };
  }
}

export function createNewsletterService(
  dataSourceFactory: DataSourceFactory = initializeDataSource
) {
  const service = {
    async subscribe(input: {
      email: string;
      source?: string;
      userId?: string | null;
    }): Promise<{ ok: true; message: string }> {
      return runWithDataSource(dataSourceFactory, async (dataSource) => {
        const repository = dataSource.getRepository(NewsletterSubscriber);
        const normalizedEmail = input.email.trim().toLowerCase();
        const existing = await repository.findOne({
          where: { email: ILike(normalizedEmail) },
        });

        if (existing?.status === NewsletterSubscriberStatus.ACTIVE) {
          return { ok: true as const, message: GENERIC_SUBSCRIBE_MESSAGE };
        }

        const rawToken = generateNewsletterRawToken();
        const confirmTokenHash = hashNewsletterToken(rawToken);
        const confirmTokenExpiresAt = newsletterConfirmExpiresAt();
        const source = input.source ?? null;
        const userId = input.userId ?? existing?.userId ?? null;

        let subscriber: NewsletterSubscriber;

        if (existing) {
          existing.status = NewsletterSubscriberStatus.PENDING;
          existing.confirmTokenHash = confirmTokenHash;
          existing.confirmTokenExpiresAt = confirmTokenExpiresAt;
          existing.unsubscribedAt = null;
          existing.source = source ?? existing.source;
          if (userId) {
            existing.userId = userId;
          }
          subscriber = await repository.save(existing);
        } else {
          subscriber = await repository.save(
            repository.create({
              email: normalizedEmail,
              userId,
              status: NewsletterSubscriberStatus.PENDING,
              confirmTokenHash,
              confirmTokenExpiresAt,
              unsubscribeTokenHash: null,
              confirmedAt: null,
              unsubscribedAt: null,
              source,
            })
          );
        }

        await enqueueConfirmEmail({
          subscriberId: subscriber.id,
          email: subscriber.email,
          confirmUrl: buildConfirmUrl(rawToken),
        });

        return { ok: true as const, message: GENERIC_SUBSCRIBE_MESSAGE };
      });
    },

    async confirmRawToken(rawToken: string): Promise<{ email: string }> {
      return runWithDataSource(dataSourceFactory, async (dataSource) => {
        const normalized = rawToken.trim();

        if (!normalized) {
          throw new ServiceError({
            code: SERVICE_ERROR_CODES.NOT_FOUND,
            message: INVALID_CONFIRM_MESSAGE,
            statusCode: 404,
          });
        }

        const repository = dataSource.getRepository(NewsletterSubscriber);
        const tokenHash = hashNewsletterToken(normalized);
        const subscriber = await repository.findOne({
          where: { confirmTokenHash: tokenHash },
        });

        if (
          !subscriber ||
          !subscriber.confirmTokenExpiresAt ||
          subscriber.confirmTokenExpiresAt.getTime() <= Date.now()
        ) {
          throw new ServiceError({
            code: SERVICE_ERROR_CODES.NOT_FOUND,
            message: INVALID_CONFIRM_MESSAGE,
            statusCode: 404,
          });
        }

        subscriber.status = NewsletterSubscriberStatus.ACTIVE;
        subscriber.confirmedAt = new Date();
        subscriber.confirmTokenHash = null;
        subscriber.confirmTokenExpiresAt = null;
        subscriber.unsubscribedAt = null;
        subscriber.unsubscribeTokenHash = generateUnsubscribeSalt();
        await repository.save(subscriber);

        return { email: subscriber.email };
      });
    },

    async peekUnsubscribeToken(rawToken: string): Promise<{ email: string } | null> {
      return runWithDataSource(dataSourceFactory, async (dataSource) => {
        const repository = dataSource.getRepository(NewsletterSubscriber);
        const parts = parseUnsubscribeToken(rawToken.trim());

        if (!parts) {
          return null;
        }

        const subscriber = await repository.findOne({
          where: { id: parts.subscriberId },
        });

        if (!subscriber?.unsubscribeTokenHash) {
          return null;
        }

        const verifiedId = verifyUnsubscribeToken(rawToken, subscriber.unsubscribeTokenHash);

        if (!verifiedId) {
          return null;
        }

        return { email: subscriber.email };
      });
    },

    async unsubscribeRawToken(rawToken: string): Promise<{ email: string }> {
      return runWithDataSource(dataSourceFactory, async (dataSource) => {
        const repository = dataSource.getRepository(NewsletterSubscriber);
        const parts = parseUnsubscribeToken(rawToken.trim());

        if (!parts) {
          throw new ServiceError({
            code: SERVICE_ERROR_CODES.NOT_FOUND,
            message: INVALID_UNSUBSCRIBE_MESSAGE,
            statusCode: 404,
          });
        }

        const subscriber = await repository.findOne({
          where: { id: parts.subscriberId },
        });

        if (!subscriber?.unsubscribeTokenHash) {
          throw new ServiceError({
            code: SERVICE_ERROR_CODES.NOT_FOUND,
            message: INVALID_UNSUBSCRIBE_MESSAGE,
            statusCode: 404,
          });
        }

        const verifiedId = verifyUnsubscribeToken(rawToken, subscriber.unsubscribeTokenHash);

        if (!verifiedId) {
          throw new ServiceError({
            code: SERVICE_ERROR_CODES.NOT_FOUND,
            message: INVALID_UNSUBSCRIBE_MESSAGE,
            statusCode: 404,
          });
        }

        if (subscriber.status !== NewsletterSubscriberStatus.UNSUBSCRIBED) {
          subscriber.status = NewsletterSubscriberStatus.UNSUBSCRIBED;
          subscriber.unsubscribedAt = new Date();
          await repository.save(subscriber);
        }

        return { email: subscriber.email };
      });
    },

    async unsubscribeById(subscriberId: string): Promise<void> {
      return runWithDataSource(dataSourceFactory, async (dataSource) => {
        const repository = dataSource.getRepository(NewsletterSubscriber);
        const subscriber = await repository.findOne({ where: { id: subscriberId } });

        if (!subscriber) {
          throw new ServiceError({
            code: SERVICE_ERROR_CODES.NOT_FOUND,
            message: "Subscriber not found.",
            statusCode: 404,
          });
        }

        subscriber.status = NewsletterSubscriberStatus.UNSUBSCRIBED;
        subscriber.unsubscribedAt = new Date();
        await repository.save(subscriber);
      });
    },

    async listSubscribers(input?: {
      status?: NewsletterSubscriberStatus;
      search?: string;
    }) {
      return runWithDataSource(dataSourceFactory, async (dataSource) => {
        const repository = dataSource.getRepository(NewsletterSubscriber);
        const where: Record<string, unknown> = {};

        if (input?.status) {
          where.status = input.status;
        }

        if (input?.search?.trim()) {
          where.email = ILike(`%${input.search.trim().toLowerCase()}%`);
        }

        const [items, total, pendingCount, activeCount, unsubscribedCount] = await Promise.all([
          repository.find({
            where,
            order: { createdAt: "DESC" },
            take: 200,
          }),
          repository.count({ where }),
          repository.count({ where: { status: NewsletterSubscriberStatus.PENDING } }),
          repository.count({ where: { status: NewsletterSubscriberStatus.ACTIVE } }),
          repository.count({ where: { status: NewsletterSubscriberStatus.UNSUBSCRIBED } }),
        ]);

        return {
          items: items.map(mapSubscriber),
          total,
          statusCounts: {
            pending: pendingCount,
            active: activeCount,
            unsubscribed: unsubscribedCount,
          },
        };
      });
    },

    async listIssues() {
      return runWithDataSource(dataSourceFactory, async (dataSource) => {
        const repository = dataSource.getRepository(NewsletterIssue);
        const issues = await repository.find({
          relations: { post: true },
          order: { createdAt: "DESC" },
          take: 100,
        });

        return {
          items: issues.map((issue) => mapIssue(issue, issue.post)),
        };
      });
    },

    async getIssue(issueId: string) {
      return runWithDataSource(dataSourceFactory, async (dataSource) => {
        const repository = dataSource.getRepository(NewsletterIssue);
        const issue = await repository.findOne({
          where: { id: issueId },
          relations: { post: true },
        });

        if (!issue) {
          throw new ServiceError({
            code: SERVICE_ERROR_CODES.NOT_FOUND,
            message: "Newsletter issue not found.",
            statusCode: 404,
          });
        }

        return mapIssue(issue, issue.post);
      });
    },

    /**
     * Idempotent: one issue per post. Call when a post first becomes PUBLISHED.
     */
    async enqueueIssueForPost(postId: string): Promise<{ issueId: string | null; created: boolean }> {
      return runWithDataSource(dataSourceFactory, async (dataSource) => {
        const issueRepository = dataSource.getRepository(NewsletterIssue);
        const existing = await issueRepository.findOne({ where: { postId } });

        if (existing) {
          return { issueId: existing.id, created: false };
        }

        const post = await dataSource.getRepository(Post).findOne({ where: { id: postId } });

        if (!post || post.status !== PostStatus.PUBLISHED) {
          return { issueId: null, created: false };
        }

        const activeSubscribers = await dataSource.getRepository(NewsletterSubscriber).find({
          where: { status: NewsletterSubscriberStatus.ACTIVE },
          select: { id: true },
        });

        const issue = await issueRepository.save(
          issueRepository.create({
            postId: post.id,
            subject: post.title,
            status: NewsletterIssueStatus.QUEUED,
            scheduledAt: new Date(),
            totalRecipients: activeSubscribers.length,
            sentCount: 0,
            failedCount: 0,
          })
        );

        if (activeSubscribers.length > 0) {
          const deliveryRepository = dataSource.getRepository(NewsletterDelivery);
          await deliveryRepository.insert(
            activeSubscribers.map((subscriber) => ({
              issueId: issue.id,
              subscriberId: subscriber.id,
              status: NewsletterDeliveryStatus.PENDING,
            }))
          );
        }

        if (activeSubscribers.length === 0) {
          issue.status = NewsletterIssueStatus.SENT;
          issue.startedAt = new Date();
          issue.finishedAt = new Date();
          await issueRepository.save(issue);
          return { issueId: issue.id, created: true };
        }

        const enqueueResult = await enqueueIssue(issue.id);

        if (!enqueueResult.queued) {
          // No RabbitMQ (or publish failed): process inline so local/dev still works.
          await service.processIssue(issue.id);
        }

        return { issueId: issue.id, created: true };
      });
    },

    async processIssue(issueId: string): Promise<void> {
      await runWithDataSource(dataSourceFactory, async (dataSource) => {
        const issueRepository = dataSource.getRepository(NewsletterIssue);
        const deliveryRepository = dataSource.getRepository(NewsletterDelivery);
        const issue = await issueRepository.findOne({
          where: { id: issueId },
          relations: { post: true },
        });

        if (!issue?.post) {
          return;
        }

        if (
          issue.status === NewsletterIssueStatus.SENT ||
          issue.status === NewsletterIssueStatus.CANCELLED
        ) {
          return;
        }

        issue.status = NewsletterIssueStatus.SENDING;
        issue.startedAt = issue.startedAt ?? new Date();
        await issueRepository.save(issue);

        for (;;) {
          const chunk = await deliveryRepository.find({
            where: {
              issueId,
              status: NewsletterDeliveryStatus.PENDING,
            },
            relations: { subscriber: true },
            take: NEWSLETTER_DELIVERY_CHUNK_SIZE,
            order: { createdAt: "ASC" },
          });

          if (chunk.length === 0) {
            break;
          }

          for (const delivery of chunk) {
            const subscriber = delivery.subscriber;

            if (
              !subscriber ||
              subscriber.status !== NewsletterSubscriberStatus.ACTIVE ||
              !subscriber.unsubscribeTokenHash
            ) {
              delivery.status = NewsletterDeliveryStatus.SKIPPED;
              delivery.errorMessage = "Subscriber not active.";
              await deliveryRepository.save(delivery);
              continue;
            }

            try {
              const unsubscribeUrl = buildUnsubscribeUrl(
                createUnsubscribeToken(subscriber.id, subscriber.unsubscribeTokenHash)
              );
              const result = await sendNewsletterIssueEmail({
                to: subscriber.email,
                subject: issue.subject,
                postTitle: issue.post.title,
                postExcerpt: issue.post.excerpt,
                postUrl: buildPostUrl(issue.post.slug),
                coverImageUrl: issue.post.coverImageUrl,
                unsubscribeUrl,
              });

              delivery.status = NewsletterDeliveryStatus.SENT;
              delivery.providerMessageId = result.providerMessageId;
              delivery.sentAt = new Date();
              delivery.errorMessage = null;
              await deliveryRepository.save(delivery);
              issue.sentCount += 1;
            } catch (error) {
              delivery.status = NewsletterDeliveryStatus.FAILED;
              delivery.errorMessage =
                error instanceof Error ? error.message : "Failed to send newsletter email.";
              await deliveryRepository.save(delivery);
              issue.failedCount += 1;
            }
          }

          await issueRepository.save(issue);
        }

        const pendingLeft = await deliveryRepository.count({
          where: { issueId, status: NewsletterDeliveryStatus.PENDING },
        });

        if (pendingLeft === 0) {
          issue.finishedAt = new Date();
          issue.status =
            issue.sentCount === 0 && issue.failedCount > 0
              ? NewsletterIssueStatus.FAILED
              : NewsletterIssueStatus.SENT;
          await issueRepository.save(issue);
        }
      });
    },

    async sendTestIssue(issueId: string, email: string): Promise<void> {
      return runWithDataSource(dataSourceFactory, async (dataSource) => {
        const issue = await dataSource.getRepository(NewsletterIssue).findOne({
          where: { id: issueId },
          relations: { post: true },
        });

        if (!issue?.post) {
          throw new ServiceError({
            code: SERVICE_ERROR_CODES.NOT_FOUND,
            message: "Newsletter issue not found.",
            statusCode: 404,
          });
        }

        const unsubscribeUrl = new URL("/newsletter/unsubscribe", env.APP_URL).toString();

        await sendNewsletterIssueEmail({
          to: email,
          subject: `[Test] ${issue.subject}`,
          postTitle: issue.post.title,
          postExcerpt: issue.post.excerpt,
          postUrl: buildPostUrl(issue.post.slug),
          coverImageUrl: issue.post.coverImageUrl,
          unsubscribeUrl,
        });
      });
    },

    async retryFailedDeliveries(issueId: string): Promise<{ requeued: number }> {
      return runWithDataSource(dataSourceFactory, async (dataSource) => {
        const issueRepository = dataSource.getRepository(NewsletterIssue);
        const deliveryRepository = dataSource.getRepository(NewsletterDelivery);
        const issue = await issueRepository.findOne({ where: { id: issueId } });

        if (!issue) {
          throw new ServiceError({
            code: SERVICE_ERROR_CODES.NOT_FOUND,
            message: "Newsletter issue not found.",
            statusCode: 404,
          });
        }

        const failed = await deliveryRepository.find({
          where: {
            issueId,
            status: NewsletterDeliveryStatus.FAILED,
          },
        });

        if (failed.length === 0) {
          return { requeued: 0 };
        }

        for (const delivery of failed) {
          delivery.status = NewsletterDeliveryStatus.PENDING;
          delivery.errorMessage = null;
          delivery.providerMessageId = null;
          delivery.sentAt = null;
        }

        await deliveryRepository.save(failed);

        // Adjust counters: failed rows move back to pending.
        issue.failedCount = Math.max(0, issue.failedCount - failed.length);
        issue.status = NewsletterIssueStatus.QUEUED;
        issue.finishedAt = null;
        await issueRepository.save(issue);

        const enqueueResult = await enqueueIssue(issue.id);

        if (!enqueueResult.queued) {
          await service.processIssue(issue.id);
        }

        return { requeued: failed.length };
      });
    },
  };

  return service;
}

export const newsletterService = createNewsletterService();
