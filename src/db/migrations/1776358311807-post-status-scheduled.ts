import { MigrationInterface, QueryRunner } from "typeorm";

export class PostStatusScheduled1776358311807 implements MigrationInterface {
  name = "PostStatusScheduled1776358311807";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "posts_status_enum" ADD VALUE IF NOT EXISTS 'SCHEDULED'`
    );
    // Non-partial: new enum value cannot be referenced in the same transaction (PG).
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_posts_status_published_at" ON "posts" ("status", "published_at")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_posts_status_published_at"`);
    // ponytail: Postgres cannot drop a single enum value safely; leave SCHEDULED in place.
  }
}
