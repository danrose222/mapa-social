import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrivateNeeds1787540000000 implements MigrationInterface {
  name = 'AddPrivateNeeds1787540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`is_private\` tinyint NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`urgency\` varchar(20) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`needs\` DROP COLUMN \`urgency\``);
    await queryRunner.query(`ALTER TABLE \`needs\` DROP COLUMN \`is_private\``);
  }
}
