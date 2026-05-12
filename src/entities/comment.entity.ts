import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Relation } from "typeorm";

import { Post } from "@/entities/post.entity";
import { User } from "@/entities/user.entity";
import type { Post as PostEntity } from "@/entities/post.entity";
import type { User as UserEntity } from "@/entities/user.entity";

export enum CommentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  SPAM = "SPAM",
}

@Entity({ name: "comments" })
export class Comment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    name: "post_id",
    type: "uuid",
  })
  postId!: string;

  @Column({
    name: "author_id",
    type: "uuid",
  })
  authorId!: string;

  @Column({
    type: "text",
  })
  content!: string;

  @Column({
    type: "enum",
    enum: CommentStatus,
    default: CommentStatus.PENDING,
  })
  status!: CommentStatus;

  @Column({
    name: "moderated_by_id",
    type: "uuid",
    nullable: true,
  })
  moderatedById!: string | null;

  @Column({
    name: "moderated_at",
    type: "timestamptz",
    nullable: true,
  })
  moderatedAt!: Date | null;

  @ManyToOne(() => Post, (post) => post.comments, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "post_id" })
  post!: Relation<PostEntity>;

  @ManyToOne(() => User, (user) => user.comments, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "author_id" })
  author!: Relation<UserEntity>;

  @ManyToOne(() => User, (user) => user.moderatedComments, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "moderated_by_id" })
  moderatedBy!: Relation<UserEntity | null>;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamptz",
  })
  updatedAt!: Date;
}
