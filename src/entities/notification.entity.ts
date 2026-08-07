import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { Relation } from "typeorm";

import { Comment } from "@/entities/comment.entity";
import { Post } from "@/entities/post.entity";
import { User } from "@/entities/user.entity";
import type { Comment as CommentEntity } from "@/entities/comment.entity";
import type { Post as PostEntity } from "@/entities/post.entity";
import type { User as UserEntity } from "@/entities/user.entity";

export enum NotificationType {
  COMMENT_REPLY = "COMMENT_REPLY",
  POST_COMMENT = "POST_COMMENT",
  POST_LIKE = "POST_LIKE",
}

@Entity({ name: "notifications" })
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    name: "user_id",
    type: "uuid",
  })
  userId!: string;

  @Column({
    name: "actor_id",
    type: "uuid",
  })
  actorId!: string;

  @Column({
    type: "enum",
    enum: NotificationType,
  })
  type!: NotificationType;

  @Column({
    name: "post_id",
    type: "uuid",
  })
  postId!: string;

  @Column({
    name: "comment_id",
    type: "uuid",
    nullable: true,
  })
  commentId!: string | null;

  @Column({
    name: "parent_comment_id",
    type: "uuid",
    nullable: true,
  })
  parentCommentId!: string | null;

  @Column({
    name: "read_at",
    type: "timestamptz",
    nullable: true,
  })
  readAt!: Date | null;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user!: Relation<UserEntity>;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "actor_id" })
  actor!: Relation<UserEntity>;

  @ManyToOne(() => Post, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "post_id" })
  post!: Relation<PostEntity>;

  @ManyToOne(() => Comment, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "comment_id" })
  comment!: Relation<CommentEntity | null>;

  @ManyToOne(() => Comment, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "parent_comment_id" })
  parentComment!: Relation<CommentEntity | null>;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
  })
  createdAt!: Date;
}
