import { MigrationInterface, QueryRunner } from "typeorm";

export class UserRoleWriter1776358311798 implements MigrationInterface {
  name = "UserRoleWriter1776358311798";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'WRITER'`
    );
  }

  public async down(): Promise<void> {
    // ponytail: Postgres cannot drop a single enum value safely; leave WRITER in place.
  }
}
