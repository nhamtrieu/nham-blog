import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import type { Relation } from "typeorm";

import { NewsletterIssue } from "@/entities/newsletter-issue.entity";
import { NewsletterSubscriber } from "@/entities/newsletter-subscriber.entity";
import type { NewsletterIssue as NewsletterIssueEntity } from "@/entities/newsletter-issue.entity";
import type { NewsletterSubscriber as NewsletterSubscriberEntity } from "@/entities/newsletter-subscriber.entity";

export enum NewsletterDeliveryStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
}

@Entity({ name: "newsletter_deliveries" })
@Unique("UQ_newsletter_deliveries_issue_subscriber", ["issueId", "subscriberId"])
export class NewsletterDelivery {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    name: "issue_id",
    type: "uuid",
  })
  issueId!: string;

  @Column({
    name: "subscriber_id",
    type: "uuid",
  })
  subscriberId!: string;

  @Column({
    type: "enum",
    enum: NewsletterDeliveryStatus,
    default: NewsletterDeliveryStatus.PENDING,
  })
  status!: NewsletterDeliveryStatus;

  @Column({
    name: "provider_message_id",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  providerMessageId!: string | null;

  @Column({
    name: "error_message",
    type: "text",
    nullable: true,
  })
  errorMessage!: string | null;

  @Column({
    name: "sent_at",
    type: "timestamptz",
    nullable: true,
  })
  sentAt!: Date | null;

  @ManyToOne(() => NewsletterIssue, (issue) => issue.deliveries, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "issue_id" })
  issue!: Relation<NewsletterIssueEntity>;

  @ManyToOne(() => NewsletterSubscriber, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "subscriber_id" })
  subscriber!: Relation<NewsletterSubscriberEntity>;

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
