import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeCiudad1785450000000 implements MigrationInterface {
  name = 'AddTypeCiudad1785450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`organizations\` ADD \`type\` varchar(20) NOT NULL DEFAULT 'ong'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` ADD \`ciudad\` varchar(100) NOT NULL DEFAULT 'Córdoba'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`ciudad\` varchar(100) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`ciudad\``);
    await queryRunner.query(
      `ALTER TABLE \`organizations\` DROP COLUMN \`ciudad\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` DROP COLUMN \`type\``,
    );
  }
}
