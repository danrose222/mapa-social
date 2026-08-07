import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationProfileToUsers1785900000000
  implements MigrationInterface
{
  name = 'AddOrganizationProfileToUsers1785900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`organization_name\` varchar(150) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`schedule\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`latitude\` decimal(10,8) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`longitude\` decimal(11,8) NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE \`user_offered_categories\` (
        \`user_id\` int NOT NULL,
        \`category_id\` int NOT NULL,
        PRIMARY KEY (\`user_id\`, \`category_id\`),
        CONSTRAINT \`FK_user_offered_categories_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_user_offered_categories_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`user_offered_categories\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`longitude\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`latitude\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`schedule\``);
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`organization_name\``,
    );
  }
}
