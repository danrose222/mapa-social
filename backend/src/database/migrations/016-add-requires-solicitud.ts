import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequiresSolicitud1786850000000 implements MigrationInterface {
  name = 'AddRequiresSolicitud1786850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`needs\` ADD \`requires_solicitud\` tinyint NOT NULL DEFAULT 0`,
    );

    // El default (0 = contacto visible para cualquier logueado) es el
    // comportamiento nuevo, pensado para necesidades creadas de acá en
    // adelante. Antes de esta columna, una necesidad SIN organización
    // tenía el contacto oculto para cualquiera que no fuera el dueño o un
    // moderador (ver el hideContactUnlessAuthorized viejo). Para no
    // exponer retroactivamente el contacto de necesidades individuales ya
    // publicadas, las marcamos con requires_solicitud = 1 -- las que ya
    // pertenecían a una organización quedan en 0, porque esas ya eran
    // visibles antes también.
    await queryRunner.query(
      `UPDATE \`needs\` SET \`requires_solicitud\` = 1 WHERE \`organization_id\` IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`needs\` DROP COLUMN \`requires_solicitud\``);
  }
}
