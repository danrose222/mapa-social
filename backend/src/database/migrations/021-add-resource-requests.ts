import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResourceRequests1788700000000 implements MigrationInterface {
  name = 'AddResourceRequests1788700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`resource_requests\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`resource_id\` int NOT NULL,
        \`organization_id\` int NOT NULL,
        \`detail_text\` text NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_resource_requests_organization\` (\`organization_id\`),
        INDEX \`IDX_resource_requests_user\` (\`user_id\`)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE \`resource_requests\`
      ADD CONSTRAINT \`FK_resource_requests_user\`
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`resource_requests\`
      ADD CONSTRAINT \`FK_resource_requests_resource\`
      FOREIGN KEY (\`resource_id\`) REFERENCES \`resources\`(\`id\`) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`resource_requests\`
      ADD CONSTRAINT \`FK_resource_requests_organization\`
      FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`resource_requests\``);
  }
}
