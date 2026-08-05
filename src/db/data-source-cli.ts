import "reflect-metadata";

import { DataSource } from "typeorm";
import type { DataSourceOptions } from "typeorm";

import { createDataSourceOptions } from "@/db/data-source";
import { AddComments1776358311793 } from "@/db/migrations/1776358311793-add-comments";
import { CommentDefaultApproved1776358311795 } from "@/db/migrations/1776358311795-comment-default-approved";
import { InitialSchema1776358311792 } from "@/db/migrations/1776358311792-initial-schema";
import { NullableUserPasswordHash1776358311794 } from "@/db/migrations/1776358311794-nullable-user-password-hash";
import { UserProfileFields1776358311796 } from "@/db/migrations/1776358311796-user-profile-fields";
import { UserAvatarUrl1776358311797 } from "@/db/migrations/1776358311797-user-avatar-url";
import { UserRoleWriter1776358311798 } from "@/db/migrations/1776358311798-user-role-writer";

type PostgresDataSourceOptions = Extract<DataSourceOptions, { type: "postgres" }>;

const migrationClasses = [
  InitialSchema1776358311792,
  AddComments1776358311793,
  NullableUserPasswordHash1776358311794,
  CommentDefaultApproved1776358311795,
  UserProfileFields1776358311796,
  UserAvatarUrl1776358311797,
  UserRoleWriter1776358311798,
];

export function createCliDataSource(overrides: Partial<PostgresDataSourceOptions> = {}) {
  return new DataSource(
    createDataSourceOptions({
      migrations: migrationClasses,
      subscribers: [],
      ...overrides,
    })
  );
}
