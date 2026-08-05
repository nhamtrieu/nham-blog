import { MigrationInterface, QueryRunner } from "typeorm";

export class NullableUserPasswordHash1776358311794 implements MigrationInterface {
  name = "NullableUserPasswordHash1776358311794";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "password_hash" = '' WHERE "password_hash" IS NULL`
    );
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL`);
  }
}
