import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModeratorRequests1789400000000 implements MigrationInterface {
  name = 'AddModeratorRequests1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`moderator_requests\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`locality\` varchar(150) NOT NULL,
        \`provincia\` varchar(100) NULL,
        \`institution_name\` varchar(150) NOT NULL,
        \`position\` varchar(150) NOT NULL,
        \`official_email\` varchar(255) NOT NULL,
        \`official_phone\` varchar(30) NOT NULL,
        \`justification\` text NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_moderator_requests_user\` (\`user_id\`)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE \`moderator_requests\`
      ADD CONSTRAINT \`FK_moderator_requests_user\`
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`moderator_requests\``);
  }
}
