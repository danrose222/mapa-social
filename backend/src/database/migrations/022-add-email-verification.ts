import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerification1788800000000 implements MigrationInterface {
  name = 'AddEmailVerification1788800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // DEFAULT true: las cuentas ya existentes quedan verificadas de una --
    // el requisito aplica solo a los registros nuevos de acá en adelante,
    // que lo van a pisar explícitamente a false en UsersService.create().
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`email_verified\` tinyint NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`email_verification_token\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`email_verification_expires_at\` timestamp NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`email_verification_expires_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`email_verification_token\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`email_verified\``,
    );
  }
}
