import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    // Resolvemos por id (sub), no por email: un email puede liberarse y
    // reasignarse a otra cuenta si la original se borra, y ahí un token
    // viejo (todavía no vencido) terminaría autenticando a la cuenta nueva.
    let user: Awaited<ReturnType<typeof this.usersService.findOne>>;

    try {
      user = await this.usersService.findOne(payload.sub);
    } catch {
      throw new UnauthorizedException('Token inválido o usuario inactivo');
    }

    if (!user.active) {
      throw new UnauthorizedException('Token inválido o usuario inactivo');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
      organizationId: user.organizationId ?? null,
      // Igual que organizationId: resuelto fresco acá, no confiado desde
      // el JWT. Habilita reglas asimétricas por tipo de organización
      // (Comunidad/ONG) sin sumar un rol nuevo en la tabla roles ni tocar
      // los guards @Roles('moderador') existentes.
      organizationType: user.organization?.type ?? null,
    };
  }
}
