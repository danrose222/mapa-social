import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModeratorRequestVerification1789500000000
  implements MigrationInterface
{
  name = 'AddModeratorRequestVerification1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`moderator_requests\` ADD \`verification_token\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`moderator_requests\` ADD \`verification_expires_at\` timestamp NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`moderator_requests\` ADD UNIQUE INDEX \`UQ_moderator_requests_token\` (\`verification_token\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`moderator_requests\` DROP INDEX \`UQ_moderator_requests_token\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`moderator_requests\` DROP COLUMN \`verification_expires_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`moderator_requests\` DROP COLUMN \`verification_token\``,
    );
  }
}
