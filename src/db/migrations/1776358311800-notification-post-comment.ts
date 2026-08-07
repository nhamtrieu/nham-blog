import { MigrationInterface, QueryRunner } from "typeorm";

export class NotificationPostComment1776358311800 implements MigrationInterface {
  name = "NotificationPostComment1776358311800";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'POST_COMMENT'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres cannot remove a single enum value safely; leave POST_COMMENT in place.
    void queryRunner;
  }
}
