import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class EmailVerification1776358311803 implements MigrationInterface {
  name = "EmailVerification1776358311803";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP WITH TIME ZONE`
    );

    // Existing accounts were never asked to verify — treat them as verified.
    await queryRunner.query(
      `UPDATE "users" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL`
    );

    await queryRunner.createTable(
      new Table({
        name: "email_verification_tokens",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "user_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "token_hash",
            type: "varchar",
            length: "64",
            isNullable: false,
            isUnique: true,
          },
          {
            name: "expires_at",
            type: "timestamptz",
            isNullable: false,
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
      "email_verification_tokens",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createIndex(
      "email_verification_tokens",
      new TableIndex({
        name: "IDX_email_verification_tokens_user_id",
        columnNames: ["user_id"],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("email_verification_tokens", true);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified_at"`);
  }
}
