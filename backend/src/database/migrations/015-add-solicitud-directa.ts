import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSolicitudDirecta1786100000000 implements MigrationInterface {
  name = 'AddSolicitudDirecta1786100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Una comunidad ahora puede pedirle ayuda directamente a un municipio u
    // ONG (sin pasar por un recurso ya publicado), indicando que tipo de
    // ayuda necesita. resource_id pasa a ser opcional para esas solicitudes.
    await queryRunner.query(
      `ALTER TABLE \`solicitudes\` MODIFY COLUMN \`resource_id\` int NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE \`solicitudes\` ADD \`target_user_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`solicitudes\` ADD CONSTRAINT \`FK_solicitudes_target_user\` FOREIGN KEY (\`target_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    );

    await queryRunner.query(
      `ALTER TABLE \`solicitudes\` ADD \`category_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`solicitudes\` ADD CONSTRAINT \`FK_solicitudes_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`solicitudes\` DROP FOREIGN KEY \`FK_solicitudes_category\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`solicitudes\` DROP COLUMN \`category_id\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`solicitudes\` DROP FOREIGN KEY \`FK_solicitudes_target_user\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`solicitudes\` DROP COLUMN \`target_user_id\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`solicitudes\` MODIFY COLUMN \`resource_id\` int NOT NULL`,
    );
  }
}
