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

@Entity({ name: "password_reset_tokens" })
export class PasswordResetToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    name: "user_id",
    type: "uuid",
  })
  userId!: string;

  @Column({
    name: "token_hash",
    type: "varchar",
    length: 64,
    unique: true,
  })
  tokenHash!: string;

  @Column({
    name: "expires_at",
    type: "timestamptz",
  })
  expiresAt!: Date;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user!: Relation<UserEntity>;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
  })
  createdAt!: Date;
}
