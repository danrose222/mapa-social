import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocalityToNeeds1785350600000 implements MigrationInterface {
  name = 'AddLocalityToNeeds1785350600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`locality\` varchar(150) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`needs\` DROP COLUMN \`locality\``);
  }
}
