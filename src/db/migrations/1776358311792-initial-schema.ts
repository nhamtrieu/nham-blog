import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class InitialSchema1776358311792 implements MigrationInterface {
  name = "InitialSchema1776358311792";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'posts_status_enum') THEN
          CREATE TYPE "posts_status_enum" AS ENUM ('DRAFT', 'PUBLISHED');
        END IF;
      END $$;`
    );

    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "email",
            type: "varchar",
            length: "255",
            isUnique: true,
          },
          {
            name: "password_hash",
            type: "varchar",
            length: "255",
          },
          {
            name: "name",
            type: "varchar",
            length: "120",
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

    await queryRunner.createTable(
      new Table({
        name: "posts",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "title",
            type: "varchar",
            length: "255",
          },
          {
            name: "slug",
            type: "varchar",
            length: "255",
            isUnique: true,
          },
          {
            name: "excerpt",
            type: "text",
            isNullable: true,
          },
          {
            name: "content_mdx",
            type: "text",
          },
          {
            name: "cover_image_url",
            type: "varchar",
            length: "2048",
            isNullable: true,
          },
          {
            name: "status",
            type: "enum",
            enumName: "posts_status_enum",
            enum: ["DRAFT", "PUBLISHED"],
            default: "'DRAFT'",
          },
          {
            name: "published_at",
            type: "timestamptz",
            isNullable: true,
          },
          {
            name: "reading_time",
            type: "integer",
            default: "0",
          },
          {
            name: "seo_title",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "seo_description",
            type: "varchar",
            length: "320",
            isNullable: true,
          },
          {
            name: "author_id",
            type: "uuid",
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

    await queryRunner.createForeignKey(
      "posts",
      new TableForeignKey({
        columnNames: ["author_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "RESTRICT",
      })
    );

    await queryRunner.createIndex(
      "posts",
      new TableIndex({
        name: "IDX_posts_author_id",
        columnNames: ["author_id"],
      })
    );

    await queryRunner.createIndex(
      "posts",
      new TableIndex({
        name: "IDX_posts_status_published_at",
        columnNames: ["status", "published_at"],
      })
    );

    await queryRunner.createTable(
      new Table({
        name: "tags",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "name",
            type: "varchar",
            length: "120",
            isUnique: true,
          },
          {
            name: "slug",
            type: "varchar",
            length: "160",
            isUnique: true,
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

    await queryRunner.createTable(
      new Table({
        name: "post_tags",
        columns: [
          {
            name: "post_id",
            type: "uuid",
            isPrimary: true,
          },
          {
            name: "tag_id",
            type: "uuid",
            isPrimary: true,
          },
        ],
      }),
      true
    );

    await queryRunner.createForeignKeys("post_tags", [
      new TableForeignKey({
        columnNames: ["post_id"],
        referencedTableName: "posts",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
      new TableForeignKey({
        columnNames: ["tag_id"],
        referencedTableName: "tags",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    ]);

    await queryRunner.createIndex(
      "post_tags",
      new TableIndex({
        name: "IDX_post_tags_tag_id",
        columnNames: ["tag_id"],
      })
    );

    await queryRunner.createTable(
      new Table({
        name: "media_assets",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "url",
            type: "varchar",
            length: "2048",
          },
          {
            name: "public_id",
            type: "varchar",
            length: "255",
            isUnique: true,
          },
          {
            name: "alt",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "width",
            type: "integer",
          },
          {
            name: "height",
            type: "integer",
          },
          {
            name: "uploaded_by_id",
            type: "uuid",
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "now()",
          },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      "media_assets",
      new TableForeignKey({
        columnNames: ["uploaded_by_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "RESTRICT",
      })
    );

    await queryRunner.createIndex(
      "media_assets",
      new TableIndex({
        name: "IDX_media_assets_uploaded_by_id",
        columnNames: ["uploaded_by_id"],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("media_assets", "IDX_media_assets_uploaded_by_id");
    await queryRunner.dropTable("media_assets");

    await queryRunner.dropIndex("post_tags", "IDX_post_tags_tag_id");
    await queryRunner.dropTable("post_tags");

    await queryRunner.dropTable("tags");

    await queryRunner.dropIndex("posts", "IDX_posts_status_published_at");
    await queryRunner.dropIndex("posts", "IDX_posts_author_id");
    await queryRunner.dropTable("posts");

    await queryRunner.dropTable("users");

    await queryRunner.query(`DROP TYPE IF EXISTS "posts_status_enum"`);
  }
}
