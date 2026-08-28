import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMunicipios1786860000000 implements MigrationInterface {
  name = 'AddMunicipios1786860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`municipios\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`nombre\` varchar(150) NOT NULL,
        \`ciudad\` varchar(100) NOT NULL,
        \`contact_info\` varchar(255) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_municipios_ciudad\` (\`ciudad\`)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`municipios\``);
  }
}
