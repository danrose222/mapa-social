import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSolicitudes1786840000000 implements MigrationInterface {
  name = 'AddSolicitudes1786840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`solicitudes\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`need_id\` int NOT NULL,
        \`helper_user_id\` int NOT NULL,
        \`message\` text NULL,
        \`status\` varchar(20) NOT NULL DEFAULT 'pending',
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`responded_at\` timestamp NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_solicitudes_need\` (\`need_id\`),
        INDEX \`IDX_solicitudes_helper\` (\`helper_user_id\`)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE \`solicitudes\`
      ADD CONSTRAINT \`FK_solicitudes_need\`
      FOREIGN KEY (\`need_id\`) REFERENCES \`needs\`(\`id\`) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`solicitudes\`
      ADD CONSTRAINT \`FK_solicitudes_helper\`
      FOREIGN KEY (\`helper_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`solicitudes\``);
  }
}
