import type { EntitySchema } from "typeorm";

import { Comment } from "@/entities/comment.entity";
import { EmailVerificationToken } from "@/entities/email-verification-token.entity";
import { MediaAsset } from "@/entities/media-asset.entity";
import { NewsletterDelivery } from "@/entities/newsletter-delivery.entity";
import { NewsletterIssue } from "@/entities/newsletter-issue.entity";
import { NewsletterSubscriber } from "@/entities/newsletter-subscriber.entity";
import { Notification } from "@/entities/notification.entity";
import { PasswordResetToken } from "@/entities/password-reset-token.entity";
import { Post } from "@/entities/post.entity";
import { PostLike } from "@/entities/post-like.entity";
import { PostSave } from "@/entities/post-save.entity";
import { PostTag } from "@/entities/post-tag.entity";
import { Tag } from "@/entities/tag.entity";
import { User } from "@/entities/user.entity";

type EntityClass = abstract new (...args: never[]) => object;

export const appEntities: Array<EntityClass | EntitySchema> = [
  User,
  EmailVerificationToken,
  PasswordResetToken,
  Post,
  Comment,
  Notification,
  Tag,
  PostTag,
  PostLike,
  PostSave,
  MediaAsset,
  NewsletterSubscriber,
  NewsletterIssue,
  NewsletterDelivery,
];

export {
  Comment,
  EmailVerificationToken,
  MediaAsset,
  NewsletterDelivery,
  NewsletterIssue,
  NewsletterSubscriber,
  Notification,
  PasswordResetToken,
  Post,
  PostLike,
  PostSave,
  PostTag,
  Tag,
  User,
};
