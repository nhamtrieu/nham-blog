import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class UserAvatarUrl1776358311797 implements MigrationInterface {
  name = "UserAvatarUrl1776358311797";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "avatar_url",
        type: "varchar",
        length: "500",
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "avatar_url");
  }
}
