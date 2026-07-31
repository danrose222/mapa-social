import * as bcrypt from 'bcrypt';

import datasource from '../datasource';

const SEED_PASSWORD = 'seed-password';
const MODERATOR_PASSWORD = 'moderador123';

async function seed(): Promise<void> {
  await datasource.initialize();

  const queryRunner = datasource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    await queryRunner.query(
      `INSERT IGNORE INTO roles (id, name, description, created_at, updated_at) VALUES (1, 'seed-role', 'Seed role', NOW(), NOW())`,
    );

    await queryRunner.query(
      `INSERT IGNORE INTO roles (id, name, description, created_at, updated_at) VALUES (2, 'moderador', 'Moderador de contenido', NOW(), NOW())`,
    );

    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);

    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, role_id, created_at, updated_at) VALUES (1, 'Seed', 'User', 'seed@example.com', ?, 1, 1, NOW(), NOW())`,
      [hashedPassword],
    );

    const hashedModeratorPassword = await bcrypt.hash(MODERATOR_PASSWORD, 10);

    await queryRunner.query(
      `INSERT IGNORE INTO users (id, first_name, last_name, email, password, active, role_id, created_at, updated_at) VALUES (2, 'Mod', 'Erator', 'moderador@example.com', ?, 1, 2, NOW(), NOW())`,
      [hashedModeratorPassword],
    );

    await queryRunner.query(
      `INSERT IGNORE INTO categories (id, name, description, active, created_at, updated_at) VALUES (1, 'General', 'Seed category', 1, NOW(), NOW())`,
    );

    await queryRunner.query(
      `INSERT INTO needs (user_id, category_id, title, description, latitude, longitude, status, created_at, updated_at)
       SELECT 1, 1, 'Necesidad muestra', 'Necesitamos voluntarios en la comunidad', -31.4201, -64.1888, 'active', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM needs WHERE title = 'Necesidad muestra')`,
    );

    await queryRunner.query(
      `INSERT INTO resources (user_id, category_id, title, description, latitude, longitude, status, created_at, updated_at)
       SELECT 1, 1, 'Recurso muestra', 'Banco de alimentos disponible', -31.417, -64.185, 'available', NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = 'Recurso muestra')`,
    );

    await queryRunner.commitTransaction();

    // eslint-disable-next-line no-console
    console.log('Seed ejecutado con éxito.');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    // eslint-disable-next-line no-console
    console.error('Error al ejecutar seed:', error);
    process.exitCode = 1;
  } finally {
    await queryRunner.release();
    await datasource.destroy();
  }
}

seed().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Error inesperado en seed:', error);
  process.exit(1);
});
