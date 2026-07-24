import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

// Rutas relativas a este archivo (no al directorio de trabajo), con
// extensión .ts o .js según se ejecute con ts-node (desarrollo) o con el
// build compilado en /dist (producción, donde el código fuente .ts no
// existe porque la imagen del backend lo excluye).
export default new DataSource({
  type: 'mysql',

  host: process.env.DB_HOST,

  port: Number(process.env.DB_PORT),

  username: process.env.DB_USER,

  password: process.env.DB_PASS,

  database: process.env.DB_NAME,

  entities: [join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],

  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],

  synchronize: false,

  logging: true,
});
