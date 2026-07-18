import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Response } from 'express';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  private getToken(payload: object): string {
    return jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    } as jwt.SignOptions);
  }

  private setCookie(res: Response, token: string): void {
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
  }

  async register(dto: RegisterDto, res: Response) {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(dto.password)) {
      throw new UnauthorizedException('La contraseña debe tener al menos 8 caracteres, una mayúscula y un carácter especial');
    }

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create(dto.email, passwordHash);
    const token = this.getToken({ sub: user.id, email: user.email });
    this.setCookie(res, token);

    return { user: { id: user.id, email: user.email } };
  }

  async login(dto: LoginDto, res: Response) {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(dto.password)) {
      throw new UnauthorizedException('La contraseña debe tener al menos 8 caracteres, una mayúscula y un carácter especial');
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = this.getToken({ sub: user.id, email: user.email });
    this.setCookie(res, token);

    return { user: { id: user.id, email: user.email } };
  }

  async getMe(token: string) {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return { user: { id: user.id, email: user.email } };
  }
}
