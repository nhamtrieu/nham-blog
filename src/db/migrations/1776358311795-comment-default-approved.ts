import { MigrationInterface, QueryRunner } from "typeorm";

export class CommentDefaultApproved1776358311795 implements MigrationInterface {
  name = "CommentDefaultApproved1776358311795";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "comments" ALTER COLUMN "status" SET DEFAULT 'APPROVED'`
    );
    await queryRunner.query(
      `UPDATE "comments" SET "status" = 'APPROVED' WHERE "status" = 'PENDING'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "comments" ALTER COLUMN "status" SET DEFAULT 'PENDING'`
    );
  }
}
