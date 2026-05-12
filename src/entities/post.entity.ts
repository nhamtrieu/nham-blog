import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Relation } from "typeorm";

import { Comment } from "@/entities/comment.entity";
import { PostTag } from "@/entities/post-tag.entity";
import { User } from "@/entities/user.entity";
import type { Comment as CommentEntity } from "@/entities/comment.entity";
import type { PostTag as PostTagEntity } from "@/entities/post-tag.entity";
import type { User as UserEntity } from "@/entities/user.entity";

export enum PostStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
}

@Entity({ name: "posts" })
export class Post {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "varchar",
    length: 255,
  })
  title!: string;

  @Column({
    type: "varchar",
    length: 255,
    unique: true,
  })
  slug!: string;

  @Column({
    type: "text",
    nullable: true,
  })
  excerpt!: string | null;

  @Column({
    name: "content_mdx",
    type: "text",
  })
  contentMdx!: string;

  @Column({
    name: "cover_image_url",
    type: "varchar",
    length: 2048,
    nullable: true,
  })
  coverImageUrl!: string | null;

  @Column({
    type: "enum",
    enum: PostStatus,
    default: PostStatus.DRAFT,
  })
  status!: PostStatus;

  @Column({
    name: "published_at",
    type: "timestamptz",
    nullable: true,
  })
  publishedAt!: Date | null;

  @Column({
    name: "reading_time",
    type: "integer",
    default: 0,
  })
  readingTime!: number;

  @Column({
    name: "seo_title",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  seoTitle!: string | null;

  @Column({
    name: "seo_description",
    type: "varchar",
    length: 320,
    nullable: true,
  })
  seoDescription!: string | null;

  @Column({
    name: "author_id",
    type: "uuid",
  })
  authorId!: string;

  @ManyToOne(() => User, (user) => user.posts, {
    nullable: true,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "author_id" })
  author!: Relation<UserEntity>;

  @OneToMany(() => PostTag, (postTag) => postTag.post)
  postTags!: Relation<PostTagEntity[]>;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments!: Relation<CommentEntity[]>;

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
