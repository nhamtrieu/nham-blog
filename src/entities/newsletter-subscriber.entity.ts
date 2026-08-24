import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Relation } from "typeorm";

import { User } from "@/entities/user.entity";
import type { User as UserEntity } from "@/entities/user.entity";

export enum NewsletterSubscriberStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  UNSUBSCRIBED = "UNSUBSCRIBED",
}

@Entity({ name: "newsletter_subscribers" })
export class NewsletterSubscriber {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "varchar",
    length: 320,
    unique: true,
  })
  email!: string;

  @Column({
    name: "user_id",
    type: "uuid",
    nullable: true,
  })
  userId!: string | null;

  @Index("IDX_newsletter_subscribers_status")
  @Column({
    type: "enum",
    enum: NewsletterSubscriberStatus,
    default: NewsletterSubscriberStatus.PENDING,
  })
  status!: NewsletterSubscriberStatus;

  @Column({
    name: "confirm_token_hash",
    type: "varchar",
    length: 64,
    nullable: true,
  })
  confirmTokenHash!: string | null;

  @Column({
    name: "confirm_token_expires_at",
    type: "timestamptz",
    nullable: true,
  })
  confirmTokenExpiresAt!: Date | null;

  /** Per-subscriber salt for HMAC unsubscribe tokens (not a password-style hash). */
  @Column({
    name: "unsubscribe_token_hash",
    type: "varchar",
    length: 64,
    nullable: true,
  })
  unsubscribeTokenHash!: string | null;

  @Column({
    name: "confirmed_at",
    type: "timestamptz",
    nullable: true,
  })
  confirmedAt!: Date | null;

  @Column({
    name: "unsubscribed_at",
    type: "timestamptz",
    nullable: true,
  })
  unsubscribedAt!: Date | null;

  @Column({
    type: "varchar",
    length: 64,
    nullable: true,
  })
  source!: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "user_id" })
  user!: Relation<UserEntity> | null;

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
