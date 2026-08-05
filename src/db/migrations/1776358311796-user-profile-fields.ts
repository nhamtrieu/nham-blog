import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class UserProfileFields1776358311796 implements MigrationInterface {
  name = "UserProfileFields1776358311796";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("users", [
      new TableColumn({
        name: "first_name",
        type: "varchar",
        length: "80",
        isNullable: true,
      }),
      new TableColumn({
        name: "last_name",
        type: "varchar",
        length: "80",
        isNullable: true,
      }),
      new TableColumn({
        name: "job_title",
        type: "varchar",
        length: "120",
        isNullable: true,
      }),
      new TableColumn({
        name: "bio",
        type: "text",
        isNullable: true,
      }),
      new TableColumn({
        name: "social_links",
        type: "jsonb",
        isNullable: false,
        default: "'{}'",
      }),
    ]);

    // ponytail: one-shot backfill from legacy `name` (Last First heuristic when 2+ tokens)
    await queryRunner.query(`
      UPDATE "users"
      SET
        "last_name" = CASE
          WHEN "name" IS NULL OR btrim("name") = '' THEN NULL
          WHEN array_length(regexp_split_to_array(btrim("name"), '\\s+'), 1) >= 2
            THEN (regexp_split_to_array(btrim("name"), '\\s+'))[1]
          ELSE NULL
        END,
        "first_name" = CASE
          WHEN "name" IS NULL OR btrim("name") = '' THEN NULL
          WHEN array_length(regexp_split_to_array(btrim("name"), '\\s+'), 1) >= 2
            THEN array_to_string((regexp_split_to_array(btrim("name"), '\\s+'))[2:], ' ')
          ELSE btrim("name")
        END
      WHERE "first_name" IS NULL AND "last_name" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "social_links");
    await queryRunner.dropColumn("users", "bio");
    await queryRunner.dropColumn("users", "job_title");
    await queryRunner.dropColumn("users", "last_name");
    await queryRunner.dropColumn("users", "first_name");
  }
}
