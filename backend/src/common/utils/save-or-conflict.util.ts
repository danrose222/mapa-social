import { ConflictException } from '@nestjs/common';
import { FindOptionsWhere, ObjectLiteral, QueryFailedError, Repository } from 'typeorm';

interface MysqlDriverError {
  code?: string;
}

export function isDuplicateKeyError(error: unknown): boolean {
  const driverError = (error as QueryFailedError)?.driverError as
    MysqlDriverError | undefined;

  return (
    error instanceof QueryFailedError && driverError?.code === 'ER_DUP_ENTRY'
  );
}

// El pre-chequeo (findOne antes de save) tiene una ventana de carrera: dos
// requests concurrentes con el mismo valor único pueden pasar el chequeo
// las dos y una de las dos termina pegándole a la constraint UNIQUE de la
// base. Sin esto, esa segunda queda como QueryFailedError sin capturar
// -- un 500 genérico en vez del 409 legible que el pre-chequeo ya da en
// el caso no concurrente.
export async function saveOrConflict<T>(
  save: () => Promise<T>,
  message: string,
): Promise<T> {
  try {
    return await save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ConflictException(message);
    }

    throw error;
  }
}

// El "findOne por un campo único, 409 legible si ya existe" (el pre-chequeo
// de arriba, no el catch de la constraint) se repetía igual en
// users.service.ts (email), organizations.service.ts (name+ciudad) y
// municipios.service.ts (ciudad, en create() y en update()).
export async function ensureUnique<T extends ObjectLiteral>(
  repository: Repository<T>,
  where: FindOptionsWhere<T>,
  message: string,
): Promise<void> {
  const existing = await repository.findOne({ where });

  if (existing) {
    throw new ConflictException(message);
  }
}
