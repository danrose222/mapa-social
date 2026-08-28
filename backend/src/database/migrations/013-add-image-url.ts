import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageUrl1786820000000 implements MigrationInterface {
  name = 'AddImageUrl1786820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`image_url\` varchar(500) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD \`image_url\` varchar(500) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`resources\` DROP COLUMN \`image_url\``);
    await queryRunner.query(`ALTER TABLE \`needs\` DROP COLUMN \`image_url\``);
  }
}
