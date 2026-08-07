import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebsiteUrlToUsers1786300000000 implements MigrationInterface {
  name = 'AddWebsiteUrlToUsers1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`website_url\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`website_url\``);
  }
}
