import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class PostLikesSavesNotifications1776358311802 implements MigrationInterface {
  name = "PostLikesSavesNotifications1776358311802";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'POST_LIKE'`
    );

    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "comment_id" DROP NOT NULL`
    );

    await queryRunner.createTable(
      new Table({
        name: "post_likes",
        columns: [
          {
            name: "user_id",
            type: "uuid",
            isPrimary: true,
          },
          {
            name: "post_id",
            type: "uuid",
            isPrimary: true,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "now()",
          },
        ],
      })
    );

    await queryRunner.createForeignKey(
      "post_likes",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createForeignKey(
      "post_likes",
      new TableForeignKey({
        columnNames: ["post_id"],
        referencedTableName: "posts",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createIndex(
      "post_likes",
      new TableIndex({
        name: "IDX_post_likes_post_id",
        columnNames: ["post_id"],
      })
    );

    await queryRunner.createTable(
      new Table({
        name: "post_saves",
        columns: [
          {
            name: "user_id",
            type: "uuid",
            isPrimary: true,
          },
          {
            name: "post_id",
            type: "uuid",
            isPrimary: true,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "now()",
          },
        ],
      })
    );

    await queryRunner.createForeignKey(
      "post_saves",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createForeignKey(
      "post_saves",
      new TableForeignKey({
        columnNames: ["post_id"],
        referencedTableName: "posts",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createIndex(
      "post_saves",
      new TableIndex({
        name: "IDX_post_saves_user_id",
        columnNames: ["user_id"],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("post_saves");
    await queryRunner.dropTable("post_likes");
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "comment_id" SET NOT NULL`
    );
    // Postgres cannot remove a single enum value safely.
  }
}
