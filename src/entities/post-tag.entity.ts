import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import type { Relation } from "typeorm";

import { Post } from "@/entities/post.entity";
import { Tag } from "@/entities/tag.entity";
import type { Post as PostEntity } from "@/entities/post.entity";
import type { Tag as TagEntity } from "@/entities/tag.entity";

@Entity({ name: "post_tags" })
export class PostTag {
  @PrimaryColumn({
    name: "post_id",
    type: "uuid",
  })
  postId!: string;

  @PrimaryColumn({
    name: "tag_id",
    type: "uuid",
  })
  tagId!: string;

  @ManyToOne(() => Post, (post) => post.postTags, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "post_id" })
  post!: Relation<PostEntity>;

  @ManyToOne(() => Tag, (tag) => tag.postTags, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "tag_id" })
  tag!: Relation<TagEntity>;
}
