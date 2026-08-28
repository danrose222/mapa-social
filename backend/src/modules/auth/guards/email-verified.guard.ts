import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Se permite iniciar sesión sin el email confirmado (JwtStrategy no lo
// bloquea) -- este guard solo se aplica a las acciones que sí lo exigen:
// publicar una necesidad/recurso, u ofrecerse/solicitar sobre uno ya
// publicado. request.user ya trae emailVerified porque JwtStrategy lo
// resuelve fresco desde la base en cada request.
//
// SKIP_EMAIL_VERIFICATION apaga esta exigencia sin tocar el resto del
// circuito (el email de confirmación se sigue mandando, el token sigue
// funcionando) -- pensado para levantar una demo sin que cada cuenta
// nueva tenga que confirmar el correo antes de poder publicar. Sin la
// variable definida, o en cualquier valor que no sea 'true', el default
// es el de siempre: exigir la verificación.
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.configService.get<string>('SKIP_EMAIL_VERIFICATION') === 'true') {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user?.emailVerified) {
      throw new ForbiddenException(
        'Confirmá tu email antes de poder publicar o enviar solicitudes. Revisá tu casilla de correo.',
      );
    }

    return true;
  }
}
