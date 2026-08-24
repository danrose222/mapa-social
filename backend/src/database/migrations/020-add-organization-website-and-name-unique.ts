import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationWebsiteAndNameUnique1788600000000
  implements MigrationInterface
{
  name = 'AddOrganizationWebsiteAndNameUnique1788600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`organizations\` ADD \`website\` varchar(255) NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE \`organizations\` ADD UNIQUE INDEX \`IDX_organizations_name\` (\`name\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`organizations\` DROP INDEX \`IDX_organizations_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` DROP COLUMN \`website\``,
    );
  }
}
