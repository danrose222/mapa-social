import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApprovedToUsers1785350700000 implements MigrationInterface {
  name = 'AddApprovedToUsers1785350700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`approved\` tinyint NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`approved\``);
  }
}
