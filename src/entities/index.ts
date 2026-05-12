import type { EntitySchema } from "typeorm";

import { Comment } from "@/entities/comment.entity";
import { MediaAsset } from "@/entities/media-asset.entity";
import { Post } from "@/entities/post.entity";
import { PostTag } from "@/entities/post-tag.entity";
import { Tag } from "@/entities/tag.entity";
import { User } from "@/entities/user.entity";

type EntityClass = abstract new (...args: never[]) => object;

export const appEntities: Array<EntityClass | EntitySchema> = [
  User,
  Post,
  Comment,
  Tag,
  PostTag,
  MediaAsset,
];

export { Comment, MediaAsset, Post, PostTag, Tag, User };
