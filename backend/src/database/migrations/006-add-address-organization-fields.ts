import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddressOrganizationFields1785350390129 implements MigrationInterface {
  name = 'AddAddressOrganizationFields1785350390129';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`address\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD \`address\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD \`organization_name\` varchar(150) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD \`schedule\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP COLUMN \`schedule\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP COLUMN \`organization_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP COLUMN \`address\``,
    );
    await queryRunner.query(`ALTER TABLE \`needs\` DROP COLUMN \`address\``);
  }
}
