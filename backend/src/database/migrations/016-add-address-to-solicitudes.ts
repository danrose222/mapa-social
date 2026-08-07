import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddressToSolicitudes1786200000000
  implements MigrationInterface
{
  name = 'AddAddressToSolicitudes1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`solicitudes\` ADD \`address\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`solicitudes\` DROP COLUMN \`address\``,
    );
  }
}
