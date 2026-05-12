import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class AddComments1776358311793 implements MigrationInterface {
  name = "AddComments1776358311793";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
          CREATE TYPE "users_role_enum" AS ENUM ('ADMIN', 'READER');
        END IF;
      END $$;`
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comments_status_enum') THEN
          CREATE TYPE "comments_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SPAM');
        END IF;
      END $$;`
    );

    const usersTable = await queryRunner.getTable("users");
    const hasRoleColumn = usersTable?.columns.some((column) => column.name === "role") ?? false;

    if (!hasRoleColumn) {
      await queryRunner.addColumn(
        "users",
        new TableColumn({
          name: "role",
          type: "enum",
          enumName: "users_role_enum",
          enum: ["ADMIN", "READER"],
          default: "'ADMIN'",
        })
      );
    }

    await queryRunner.createTable(
      new Table({
        name: "comments",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "post_id",
            type: "uuid",
          },
          {
            name: "author_id",
            type: "uuid",
          },
          {
            name: "content",
            type: "text",
          },
          {
            name: "status",
            type: "enum",
            enumName: "comments_status_enum",
            enum: ["PENDING", "APPROVED", "REJECTED", "SPAM"],
            default: "'PENDING'",
          },
          {
            name: "moderated_by_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "moderated_at",
            type: "timestamptz",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "now()",
          },
          {
            name: "updated_at",
            type: "timestamptz",
            default: "now()",
          },
        ],
      }),
      true
    );

    await queryRunner.createForeignKeys("comments", [
      new TableForeignKey({
        columnNames: ["post_id"],
        referencedTableName: "posts",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
      new TableForeignKey({
        columnNames: ["author_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
      new TableForeignKey({
        columnNames: ["moderated_by_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    ]);

    await queryRunner.createIndices("comments", [
      new TableIndex({
        name: "IDX_comments_post_status_created",
        columnNames: ["post_id", "status", "created_at", "id"],
      }),
      new TableIndex({
        name: "IDX_comments_status_created",
        columnNames: ["status", "created_at"],
      }),
      new TableIndex({
        name: "IDX_comments_author_created",
        columnNames: ["author_id", "created_at"],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("comments", true);

    const usersTable = await queryRunner.getTable("users");
    const hasRoleColumn = usersTable?.columns.some((column) => column.name === "role") ?? false;

    if (hasRoleColumn) {
      await queryRunner.dropColumn("users", "role");
    }

    await queryRunner.query(`DROP TYPE IF EXISTS "comments_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}
