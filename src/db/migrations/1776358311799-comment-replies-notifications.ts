import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class CommentRepliesNotifications1776358311799 implements MigrationInterface {
  name = "CommentRepliesNotifications1776358311799";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "comments",
      new TableColumn({
        name: "parent_id",
        type: "uuid",
        isNullable: true,
      })
    );

    await queryRunner.createForeignKey(
      "comments",
      new TableForeignKey({
        columnNames: ["parent_id"],
        referencedTableName: "comments",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createIndex(
      "comments",
      new TableIndex({
        name: "IDX_comments_post_parent_created",
        columnNames: ["post_id", "parent_id", "created_at"],
      })
    );

    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') THEN
          CREATE TYPE "notifications_type_enum" AS ENUM ('COMMENT_REPLY');
        END IF;
      END $$;`
    );

    await queryRunner.createTable(
      new Table({
        name: "notifications",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "user_id",
            type: "uuid",
          },
          {
            name: "actor_id",
            type: "uuid",
          },
          {
            name: "type",
            type: "enum",
            enumName: "notifications_type_enum",
            enum: ["COMMENT_REPLY"],
          },
          {
            name: "post_id",
            type: "uuid",
          },
          {
            name: "comment_id",
            type: "uuid",
          },
          {
            name: "parent_comment_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "read_at",
            type: "timestamptz",
            isNullable: true,
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
      "notifications",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createForeignKey(
      "notifications",
      new TableForeignKey({
        columnNames: ["actor_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createForeignKey(
      "notifications",
      new TableForeignKey({
        columnNames: ["post_id"],
        referencedTableName: "posts",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createForeignKey(
      "notifications",
      new TableForeignKey({
        columnNames: ["comment_id"],
        referencedTableName: "comments",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createForeignKey(
      "notifications",
      new TableForeignKey({
        columnNames: ["parent_comment_id"],
        referencedTableName: "comments",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      })
    );

    await queryRunner.createIndex(
      "notifications",
      new TableIndex({
        name: "IDX_notifications_user_created",
        columnNames: ["user_id", "created_at"],
      })
    );

    await queryRunner.createIndex(
      "notifications",
      new TableIndex({
        name: "IDX_notifications_user_read",
        columnNames: ["user_id", "read_at"],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("notifications");
    await queryRunner.query(`DROP TYPE IF EXISTS "notifications_type_enum"`);

    const commentsTable = await queryRunner.getTable("comments");
    const parentFk = commentsTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes("parent_id")
    );

    if (parentFk) {
      await queryRunner.dropForeignKey("comments", parentFk);
    }

    await queryRunner.dropIndex("comments", "IDX_comments_post_parent_created");
    await queryRunner.dropColumn("comments", "parent_id");
  }
}
