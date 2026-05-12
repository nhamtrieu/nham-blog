import "reflect-metadata";

import { DataSource } from "typeorm";
import type { DataSourceOptions } from "typeorm";

import { createDataSourceOptions } from "@/db/data-source";
import { AddComments1776358311793 } from "@/db/migrations/1776358311793-add-comments";
import { InitialSchema1776358311792 } from "@/db/migrations/1776358311792-initial-schema";

type PostgresDataSourceOptions = Extract<DataSourceOptions, { type: "postgres" }>;

const migrationClasses = [InitialSchema1776358311792, AddComments1776358311793];

export function createCliDataSource(overrides: Partial<PostgresDataSourceOptions> = {}) {
  return new DataSource(
    createDataSourceOptions({
      migrations: migrationClasses,
      subscribers: [],
      ...overrides,
    })
  );
}
