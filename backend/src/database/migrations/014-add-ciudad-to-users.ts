import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCiudadToUsers1786000000000 implements MigrationInterface {
  name = 'AddCiudadToUsers1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`ciudad\` varchar(100) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`ciudad\``);
  }
}
