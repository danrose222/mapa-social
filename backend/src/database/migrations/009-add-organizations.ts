import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizations1785440000000 implements MigrationInterface {
  name = 'AddOrganizations1785440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`organizations\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`name\` varchar(150) NOT NULL,
        \`description\` text NULL,
        \`contact_info\` varchar(255) NULL,
        \`address\` varchar(255) NULL,
        \`verified\` tinyint NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`)
      )
    `);

    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`organization_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD CONSTRAINT \`FK_users_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE SET NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`organization_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD CONSTRAINT \`FK_needs_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE SET NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP COLUMN \`organization_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD \`organization_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD CONSTRAINT \`FK_resources_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP FOREIGN KEY \`FK_resources_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP COLUMN \`organization_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD \`organization_name\` varchar(150) NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE \`needs\` DROP FOREIGN KEY \`FK_needs_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` DROP COLUMN \`organization_id\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_users_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`organization_id\``,
    );

    await queryRunner.query(`DROP TABLE \`organizations\``);
  }
}
