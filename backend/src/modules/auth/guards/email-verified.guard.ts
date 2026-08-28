import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

// Se permite iniciar sesión sin el email confirmado (JwtStrategy no lo
// bloquea) -- este guard solo se aplica a las acciones que sí lo exigen:
// publicar una necesidad/recurso, u ofrecerse/solicitar sobre uno ya
// publicado. request.user ya trae emailVerified porque JwtStrategy lo
// resuelve fresco desde la base en cada request.
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user?.emailVerified) {
      throw new ForbiddenException(
        'Confirmá tu email antes de poder publicar o enviar solicitudes. Revisá tu casilla de correo.',
      );
    }

    return true;
  }
}
