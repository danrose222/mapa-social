import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactFields1785350500000 implements MigrationInterface {
  name = 'AddContactFields1785350500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`contact_name\` varchar(150) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`contact_info\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD \`contact_name\` varchar(150) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` ADD \`contact_info\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP COLUMN \`contact_info\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resources\` DROP COLUMN \`contact_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` DROP COLUMN \`contact_info\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`needs\` DROP COLUMN \`contact_name\``,
    );
  }
}
