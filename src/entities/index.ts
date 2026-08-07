import type { EntitySchema } from "typeorm";

import { Comment } from "@/entities/comment.entity";
import { MediaAsset } from "@/entities/media-asset.entity";
import { Notification } from "@/entities/notification.entity";
import { Post } from "@/entities/post.entity";
import { PostLike } from "@/entities/post-like.entity";
import { PostSave } from "@/entities/post-save.entity";
import { PostTag } from "@/entities/post-tag.entity";
import { Tag } from "@/entities/tag.entity";
import { User } from "@/entities/user.entity";

type EntityClass = abstract new (...args: never[]) => object;

export const appEntities: Array<EntityClass | EntitySchema> = [
  User,
  Post,
  Comment,
  Notification,
  Tag,
  PostTag,
  PostLike,
  PostSave,
  MediaAsset,
];

export {
  Comment,
  MediaAsset,
  Notification,
  Post,
  PostLike,
  PostSave,
  PostTag,
  Tag,
  User,
};
