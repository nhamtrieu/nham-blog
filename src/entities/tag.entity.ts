import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Relation } from "typeorm";

import { PostTag } from "@/entities/post-tag.entity";
import type { PostTag as PostTagEntity } from "@/entities/post-tag.entity";

@Entity({ name: "tags" })
export class Tag {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "varchar",
    length: 120,
    unique: true,
  })
  name!: string;

  @Column({
    type: "varchar",
    length: 160,
    unique: true,
  })
  slug!: string;

  @OneToMany(() => PostTag, (postTag) => postTag.tag)
  postTags!: Relation<PostTagEntity[]>;

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
