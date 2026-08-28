import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResolvedTracking1785470000000 implements MigrationInterface {
  name = 'AddResolvedTracking1785470000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`resolved_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD CONSTRAINT \`FK_needs_resolved_by\` FOREIGN KEY (\`resolved_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`resolved_at\` datetime NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD \`resolved_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD CONSTRAINT \`FK_resources_resolved_by\` FOREIGN KEY (\`resolved_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD \`resolved_at\` datetime NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP FOREIGN KEY \`FK_resources_resolved_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP COLUMN \`resolved_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP COLUMN \`resolved_by\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`needs\` DROP FOREIGN KEY \`FK_needs_resolved_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` DROP COLUMN \`resolved_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` DROP COLUMN \`resolved_by\``,
    );
  }
}
