import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddressGenderToUsers1785800000000
  implements MigrationInterface
{
  name = 'AddAddressGenderToUsers1785800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`address\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`gender\` varchar(20) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`gender\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`address\``);
  }
}
