import { MigrationInterface, QueryRunner } from 'typeorm';

// El nombre de organización era único a nivel global (migración 020),
// pero dos organizaciones sin relación entre sí en ciudades distintas
// pueden compartir un nombre genérico legítimo (ej. "Comedor San
// Cayetano" en dos pueblos distintos) -- la unicidad tiene sentido por
// jurisdicción, no en todo el país. Pasa a (name, ciudad).
export class ScopeOrganizationNameUniqueByCiudad1789700000000
  implements MigrationInterface
{
  name = 'ScopeOrganizationNameUniqueByCiudad1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`organizations\` DROP INDEX \`IDX_organizations_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` ADD UNIQUE INDEX \`UQ_organizations_name_ciudad\` (\`name\`, \`ciudad\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`organizations\` DROP INDEX \`UQ_organizations_name_ciudad\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` ADD UNIQUE INDEX \`IDX_organizations_name\` (\`name\`)`,
    );
  }
}
