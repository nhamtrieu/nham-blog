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

import { NewsletterDelivery } from "@/entities/newsletter-delivery.entity";
import { Post } from "@/entities/post.entity";
import type { NewsletterDelivery as NewsletterDeliveryEntity } from "@/entities/newsletter-delivery.entity";
import type { Post as PostEntity } from "@/entities/post.entity";

export enum NewsletterIssueStatus {
  QUEUED = "QUEUED",
  SENDING = "SENDING",
  SENT = "SENT",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

@Entity({ name: "newsletter_issues" })
export class NewsletterIssue {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    name: "post_id",
    type: "uuid",
    unique: true,
  })
  postId!: string;

  @Column({
    type: "varchar",
    length: 255,
  })
  subject!: string;

  @Column({
    type: "enum",
    enum: NewsletterIssueStatus,
    default: NewsletterIssueStatus.QUEUED,
  })
  status!: NewsletterIssueStatus;

  @Column({
    name: "scheduled_at",
    type: "timestamptz",
    nullable: true,
  })
  scheduledAt!: Date | null;

  @Column({
    name: "started_at",
    type: "timestamptz",
    nullable: true,
  })
  startedAt!: Date | null;

  @Column({
    name: "finished_at",
    type: "timestamptz",
    nullable: true,
  })
  finishedAt!: Date | null;

  @Column({
    name: "total_recipients",
    type: "integer",
    default: 0,
  })
  totalRecipients!: number;

  @Column({
    name: "sent_count",
    type: "integer",
    default: 0,
  })
  sentCount!: number;

  @Column({
    name: "failed_count",
    type: "integer",
    default: 0,
  })
  failedCount!: number;

  @ManyToOne(() => Post, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "post_id" })
  post!: Relation<PostEntity>;

  @OneToMany(() => NewsletterDelivery, (delivery) => delivery.issue)
  deliveries!: Relation<NewsletterDeliveryEntity[]>;

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
