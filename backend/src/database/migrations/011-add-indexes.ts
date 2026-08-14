import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexes1785460000000 implements MigrationInterface {
  name = 'AddIndexes1785460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD INDEX \`idx_needs_status\` (\`status\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD INDEX \`idx_resources_status\` (\`status\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` ADD INDEX \`idx_organizations_ciudad\` (\`ciudad\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` ADD INDEX \`idx_organizations_verified\` (\`verified\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`organizations\` DROP INDEX \`idx_organizations_verified\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` DROP INDEX \`idx_organizations_ciudad\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP INDEX \`idx_resources_status\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` DROP INDEX \`idx_needs_status\``,
    );
  }
}
