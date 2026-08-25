import { MigrationInterface, QueryRunner } from 'typeorm';

// Sin esto, confirmar el mismo token de verificación de moderador dos
// veces casi en simultáneo (ej. un cliente de correo que prefetchea el
// link) podía insertar dos filas ModeratorLocality idénticas -- ninguna
// de las dos lecturas veía todavía la fila de la otra. La restricción
// UNIQUE hace que la segunda inserción falle en vez de duplicar la
// jurisdicción.
export class AddModeratorLocalityUnique1789600000000 implements MigrationInterface {
  name = 'AddModeratorLocalityUnique1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`moderator_localities\` ADD UNIQUE INDEX \`UQ_moderator_localities_user_locality\` (\`user_id\`, \`locality\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`moderator_localities\` DROP INDEX \`UQ_moderator_localities_user_locality\``,
    );
  }
}
