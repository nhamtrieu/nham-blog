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
}

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
  })
  passwordHash!: string;

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
