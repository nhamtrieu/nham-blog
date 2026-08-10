import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Relation } from "typeorm";

import { MediaAsset } from "@/entities/media-asset.entity";
import { Comment } from "@/entities/comment.entity";
import { Post } from "@/entities/post.entity";
import type { Comment as CommentEntity } from "@/entities/comment.entity";
import type { MediaAsset as MediaAssetEntity } from "@/entities/media-asset.entity";
import type { Post as PostEntity } from "@/entities/post.entity";

export enum UserRole {
  ADMIN = "ADMIN",
  READER = "READER",
  WRITER = "WRITER",
}

export type UserSocialLinks = {
  twitter?: string;
  facebook?: string;
  tiktok?: string;
  personal?: string;
  github?: string;
  youtube?: string;
  linkedin?: string;
};

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "varchar",
    length: 255,
    unique: true,
  })
  email!: string;

  @Column({
    name: "password_hash",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  passwordHash!: string | null;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.ADMIN,
  })
  role!: UserRole;

  @Column({
    type: "varchar",
    length: 120,
    nullable: true,
  })
  name!: string | null;

  @Column({
    name: "first_name",
    type: "varchar",
    length: 80,
    nullable: true,
  })
  firstName!: string | null;

  @Column({
    name: "last_name",
    type: "varchar",
    length: 80,
    nullable: true,
  })
  lastName!: string | null;

  @Column({
    name: "job_title",
    type: "varchar",
    length: 120,
    nullable: true,
  })
  jobTitle!: string | null;

  @Column({
    type: "text",
    nullable: true,
  })
  bio!: string | null;

  @Column({
    name: "social_links",
    type: "jsonb",
    default: () => "'{}'",
  })
  socialLinks!: UserSocialLinks;

  @Column({
    name: "avatar_url",
    type: "varchar",
    length: 500,
    nullable: true,
  })
  avatarUrl!: string | null;

  @Column({
    name: "email_verified_at",
    type: "timestamptz",
    nullable: true,
  })
  emailVerifiedAt!: Date | null;

  @OneToMany(() => Post, (post) => post.author)
  posts!: Relation<PostEntity[]>;

  @OneToMany(() => MediaAsset, (mediaAsset) => mediaAsset.uploadedBy)
  mediaAssets!: Relation<MediaAssetEntity[]>;

  @OneToMany(() => Comment, (comment) => comment.author)
  comments!: Relation<CommentEntity[]>;

  @OneToMany(() => Comment, (comment) => comment.moderatedBy)
  moderatedComments!: Relation<CommentEntity[]>;

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
