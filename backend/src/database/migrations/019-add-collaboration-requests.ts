import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCollaborationRequests1788400000000 implements MigrationInterface {
  name = 'AddCollaborationRequests1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`collaboration_requests\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`organization_id\` int NOT NULL,
        \`contact_name\` varchar(150) NOT NULL,
        \`contact_email\` varchar(255) NOT NULL,
        \`message\` text NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_collaboration_requests_organization\` (\`organization_id\`)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE \`collaboration_requests\`
      ADD CONSTRAINT \`FK_collaboration_requests_organization\`
      FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`collaboration_requests\``);
  }
}
