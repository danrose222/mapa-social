import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequiresSolicitud1786850000000 implements MigrationInterface {
  name = 'AddRequiresSolicitud1786850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`requires_solicitud\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`needs\` DROP COLUMN \`requires_solicitud\``);
  }
}
