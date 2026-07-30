import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactAndResolutionFields1785350390130
  implements MigrationInterface
{
  name = 'AddContactAndResolutionFields1785350390130';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`contact_name\` varchar(120) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`contact_info\` varchar(150) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`resolved_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`resolved_at\` datetime NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD \`contact_info\` varchar(150) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD \`resolved_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD \`resolved_at\` datetime NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP COLUMN \`resolved_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP COLUMN \`resolved_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP COLUMN \`contact_info\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` DROP COLUMN \`resolved_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` DROP COLUMN \`resolved_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` DROP COLUMN \`contact_info\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` DROP COLUMN \`contact_name\``,
    );
  }
}
