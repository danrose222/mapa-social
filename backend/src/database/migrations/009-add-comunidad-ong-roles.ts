import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComunidadOngRoles1785500000000 implements MigrationInterface {
  name = 'AddComunidadOngRoles1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT IGNORE INTO \`roles\` (id, name, description, created_at, updated_at) VALUES (4, 'comunidad', 'Comedor, club o centro comunitario', NOW(), NOW())`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO \`roles\` (id, name, description, created_at, updated_at) VALUES (5, 'ong', 'ONG o fundacion que dona recursos', NOW(), NOW())`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM \`roles\` WHERE id IN (4, 5)`);
  }
}
