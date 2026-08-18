import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocalityRequests1786860000000 implements MigrationInterface {
  name = 'AddLocalityRequests1786860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`locality_requests\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`locality\` varchar(150) NOT NULL,
        \`provincia\` varchar(100) NULL,
        \`status\` varchar(20) NOT NULL DEFAULT 'pending',
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`responded_at\` timestamp NULL,
        \`responded_by_id\` int NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_locality_requests_user\` (\`user_id\`)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE \`locality_requests\`
      ADD CONSTRAINT \`FK_locality_requests_user\`
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`locality_requests\`
      ADD CONSTRAINT \`FK_locality_requests_responded_by\`
      FOREIGN KEY (\`responded_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`locality_requests\``);
  }
}
