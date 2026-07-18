import { Injectable } from '@nestjs/common';
import { createConnection } from 'mysql2/promise';

@Injectable()
export class UsersService {
  private readonly connection = createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'mapa_user',
    password: process.env.DB_PASS || 'mapa_password',
    database: process.env.DB_NAME || 'mapa_social',
  });

  async findByEmail(email: string) {
    const connection = await this.connection;
    const [rows]: any = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  }

  async findById(id: number) {
    const connection = await this.connection;
    const [rows]: any = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async create(email: string, passwordHash: string) {
    const connection = await this.connection;
    const [result]: any = await connection.execute('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, passwordHash]);
    return { id: result.insertId, email };
  }
}
