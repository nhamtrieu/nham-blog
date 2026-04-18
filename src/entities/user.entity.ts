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
import { Post } from "@/entities/post.entity";
import type { MediaAsset as MediaAssetEntity } from "@/entities/media-asset.entity";
import type { Post as PostEntity } from "@/entities/post.entity";

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
    type: "varchar",
    length: 120,
    nullable: true,
  })
  name!: string | null;

  @OneToMany(() => Post, (post) => post.author)
  posts!: Relation<PostEntity[]>;

  @OneToMany(() => MediaAsset, (mediaAsset) => mediaAsset.uploadedBy)
  mediaAssets!: Relation<MediaAssetEntity[]>;

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
