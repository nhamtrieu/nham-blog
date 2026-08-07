import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class TagOrderNumber1776358311801 implements MigrationInterface {
  name = "TagOrderNumber1776358311801";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "tags",
      new TableColumn({
        name: "order_number",
        type: "int",
        isNullable: true,
      })
    );

    await queryRunner.query(`
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY name ASC, created_at ASC) AS rn
        FROM tags
      )
      UPDATE tags
      SET order_number = ordered.rn
      FROM ordered
      WHERE tags.id = ordered.id
    `);

    await queryRunner.query(`ALTER TABLE tags ALTER COLUMN order_number SET NOT NULL`);
    await queryRunner.query(
      `CREATE INDEX "IDX_tags_order_number" ON tags ("order_number")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_tags_order_number"`);
    await queryRunner.dropColumn("tags", "order_number");
  }
}
