import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class PostEmbedding1776358311806 implements MigrationInterface {
  name = "PostEmbedding1776358311806";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "posts",
      new TableColumn({
        name: "embedding",
        type: "float8",
        isArray: true,
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("posts", "embedding");
  }
}
