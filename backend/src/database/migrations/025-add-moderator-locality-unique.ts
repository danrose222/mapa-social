import { MigrationInterface, QueryRunner } from 'typeorm';

// Sin esto, confirmar el mismo token de verificación de moderador dos
// veces casi en simultáneo (ej. un cliente de correo que prefetchea el
// link) podía insertar dos filas ModeratorLocality idénticas -- ninguna
// de las dos lecturas veía todavía la fila de la otra. La restricción
// UNIQUE hace que la segunda inserción falle en vez de duplicar la
// jurisdicción.
//
// 014-add-moderator-localities ya crea este mismo índice inline al armar
// la tabla -- esta migración quedó duplicada (mismo nombre, misma tabla)
// y en una base limpia migration:run explota acá con "Duplicate key name".
// up() ahora chequea si el índice ya existe antes de crearlo, así queda
// como no-op efectivo en una base nueva y sigue sumando el índice en una
// base vieja que corrió esta migración antes de que existiera en la 014
// (no debería quedar ninguna, pero por las dudas).
export class AddModeratorLocalityUnique1789600000000 implements MigrationInterface {
  name = 'AddModeratorLocalityUnique1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(
      `SELECT 1 FROM information_schema.STATISTICS
       WHERE table_schema = DATABASE()
         AND table_name = 'moderator_localities'
         AND index_name = 'UQ_moderator_localities_user_locality'
       LIMIT 1`,
    );

    if (existing.length > 0) {
      return;
    }

    await queryRunner.query(
      `ALTER TABLE \`moderator_localities\` ADD UNIQUE INDEX \`UQ_moderator_localities_user_locality\` (\`user_id\`, \`locality\`)`,
    );
  }

  // No-op a propósito: el índice es responsabilidad de 014 (lo crea inline
  // al armar la tabla). Si down() lo borrara acá, revertir solo esta
  // migración dejaría moderator_localities sin el índice que 014 necesita
  // -- su propio down() solo borra la tabla entera, no lo recrea.
  public async down(): Promise<void> {}
}
