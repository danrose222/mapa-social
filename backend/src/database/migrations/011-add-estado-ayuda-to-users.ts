import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEstadoAyudaToUsers1785700000000
  implements MigrationInterface
{
  name = 'AddEstadoAyudaToUsers1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`estado_ayuda\` varchar(20) NOT NULL DEFAULT 'estable'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`estado_ayuda\``,
    );
  }
}
