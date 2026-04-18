import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { Relation } from "typeorm";

import { User } from "@/entities/user.entity";
import type { User as UserEntity } from "@/entities/user.entity";

@Entity({ name: "media_assets" })
export class MediaAsset {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "varchar",
    length: 2048,
  })
  url!: string;

  @Column({
    name: "public_id",
    type: "varchar",
    length: 255,
    unique: true,
  })
  publicId!: string;

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
  })
  alt!: string | null;

  @Column({
    type: "integer",
  })
  width!: number;

  @Column({
    type: "integer",
  })
  height!: number;

  @Column({
    name: "uploaded_by_id",
    type: "uuid",
  })
  uploadedById!: string;

  @ManyToOne(() => User, (user) => user.mediaAssets, {
    nullable: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "uploaded_by_id" })
  uploadedBy!: Relation<UserEntity>;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
  })
  createdAt!: Date;
}
