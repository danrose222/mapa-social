import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export default new DataSource({
  type: 'mysql',

  host: process.env.DB_HOST,

  port: Number(process.env.DB_PORT),

  username: process.env.DB_USER,

  password: process.env.DB_PASS,

  database: process.env.DB_NAME,

  entities: ['src/modules/**/*.entity.ts'],

  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,

  logging: true,
});
