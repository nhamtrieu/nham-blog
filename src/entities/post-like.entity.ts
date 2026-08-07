import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import type { Relation } from "typeorm";

import { Post } from "@/entities/post.entity";
import { User } from "@/entities/user.entity";
import type { Post as PostEntity } from "@/entities/post.entity";
import type { User as UserEntity } from "@/entities/user.entity";

@Entity({ name: "post_likes" })
export class PostLike {
  @PrimaryColumn({
    name: "user_id",
    type: "uuid",
  })
  userId!: string;

  @PrimaryColumn({
    name: "post_id",
    type: "uuid",
  })
  postId!: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user!: Relation<UserEntity>;

  @ManyToOne(() => Post, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "post_id" })
  post!: Relation<PostEntity>;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
  })
  createdAt!: Date;
}
