import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModeratorLocalities1786830000000 implements MigrationInterface {
  name = 'AddModeratorLocalities1786830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`moderator_localities\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`locality\` varchar(150) NOT NULL,
        \`provincia\` varchar(100) NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_moderator_localities_user_locality\` (\`user_id\`, \`locality\`)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE \`moderator_localities\`
      ADD CONSTRAINT \`FK_moderator_localities_user\`
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`moderator_localities\``);
  }
}
