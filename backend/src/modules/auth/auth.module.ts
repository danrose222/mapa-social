import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';

import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Acotado a /auth/login (ver el guard en auth.controller.ts) -- no es
    // un límite global de la API, solo de la ruta expuesta a fuerza bruta.
    ThrottlerModule.forRoot([
      {
        name: 'login',
        ttl: 60_000,
        limit: 5,
      },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          // Sin este default, si falta la variable de entorno JWT_EXPIRES
          // queda undefined y jsonwebtoken emite tokens sin vencimiento.
          expiresIn: (configService.get<string>('JWT_EXPIRES') ?? '7d') as
            `${number}${'s' | 'm' | 'h' | 'd'}` | number,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, RolesGuard, JwtModule],
})
export class AuthModule {}
