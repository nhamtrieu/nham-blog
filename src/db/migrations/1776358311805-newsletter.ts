import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from "typeorm";

export class Newsletter1776358311805 implements MigrationInterface {
  name = "Newsletter1776358311805";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "newsletter_subscribers_status_enum" AS ENUM ('PENDING', 'ACTIVE', 'UNSUBSCRIBED')
    `);
    await queryRunner.query(`
      CREATE TYPE "newsletter_issues_status_enum" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED')
    `);
    await queryRunner.query(`
      CREATE TYPE "newsletter_deliveries_status_enum" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED')
    `);

    await queryRunner.createTable(
      new Table({
        name: "newsletter_subscribers",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "email",
            type: "varchar",
            length: "320",
            isNullable: false,
            isUnique: true,
          },
          {
            name: "user_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "status",
            type: "newsletter_subscribers_status_enum",
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: "confirm_token_hash",
            type: "varchar",
            length: "64",
            isNullable: true,
          },
          {
            name: "confirm_token_expires_at",
            type: "timestamptz",
            isNullable: true,
          },
          {
            name: "unsubscribe_token_hash",
            type: "varchar",
            length: "64",
            isNullable: true,
          },
          {
            name: "confirmed_at",
            type: "timestamptz",
            isNullable: true,
          },
          {
            name: "unsubscribed_at",
            type: "timestamptz",
            isNullable: true,
          },
          {
            name: "source",
            type: "varchar",
            length: "64",
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

    await queryRunner.createForeignKey(
      "newsletter_subscribers",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      })
    );

    await queryRunner.createIndex(
      "newsletter_subscribers",
      new TableIndex({
        name: "IDX_newsletter_subscribers_status",
        columnNames: ["status"],
      })
    );

    await queryRunner.createTable(
      new Table({
        name: "newsletter_issues",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "post_id",
            type: "uuid",
            isNullable: false,
            isUnique: true,
          },
          {
            name: "subject",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "status",
            type: "newsletter_issues_status_enum",
            default: "'QUEUED'",
            isNullable: false,
          },
          {
            name: "scheduled_at",
            type: "timestamptz",
            isNullable: true,
          },
          {
            name: "started_at",
            type: "timestamptz",
            isNullable: true,
          },
          {
            name: "finished_at",
            type: "timestamptz",
            isNullable: true,
          },
          {
            name: "total_recipients",
            type: "integer",
            default: 0,
            isNullable: false,
          },
          {
            name: "sent_count",
            type: "integer",
            default: 0,
            isNullable: false,
          },
          {
            name: "failed_count",
            type: "integer",
            default: 0,
            isNullable: false,
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
      "newsletter_issues",
      new TableForeignKey({
        columnNames: ["post_id"],
        referencedTableName: "posts",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createTable(
      new Table({
        name: "newsletter_deliveries",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "issue_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "subscriber_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "status",
            type: "newsletter_deliveries_status_enum",
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: "provider_message_id",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "error_message",
            type: "text",
            isNullable: true,
          },
          {
            name: "sent_at",
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

    await queryRunner.createForeignKey(
      "newsletter_deliveries",
      new TableForeignKey({
        columnNames: ["issue_id"],
        referencedTableName: "newsletter_issues",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createForeignKey(
      "newsletter_deliveries",
      new TableForeignKey({
        columnNames: ["subscriber_id"],
        referencedTableName: "newsletter_subscribers",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createUniqueConstraint(
      "newsletter_deliveries",
      new TableUnique({
        name: "UQ_newsletter_deliveries_issue_subscriber",
        columnNames: ["issue_id", "subscriber_id"],
      })
    );

    await queryRunner.createIndex(
      "newsletter_deliveries",
      new TableIndex({
        name: "IDX_newsletter_deliveries_issue_status",
        columnNames: ["issue_id", "status"],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("newsletter_deliveries", true);
    await queryRunner.dropTable("newsletter_issues", true);
    await queryRunner.dropTable("newsletter_subscribers", true);
    await queryRunner.query(`DROP TYPE IF EXISTS "newsletter_deliveries_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "newsletter_issues_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "newsletter_subscribers_status_enum"`);
  }
}
