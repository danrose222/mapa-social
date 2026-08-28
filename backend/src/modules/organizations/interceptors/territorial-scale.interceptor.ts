import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import { MunicipiosService } from '../../municipios/municipios.service';

// Regla de "Burocracia vs. Confianza" del documento de visión: una
// ciudad con Municipio registrado tiene el aparato de gobierno para
// sostener un circuito de aval formal (regulado); un pueblo sin esa
// estructura se autogestiona (alta directa). Se resuelve acá, antes del
// handler, porque depende solo del dato de entrada (la ciudad tipeada),
// no de reglas de autorización del usuario -- así OrganizationsService
// solo lee un hecho ya resuelto, en vez de mezclar la consulta a
// Municipios con el resto de su lógica de creación.
//
// Sin `ciudad` (body todavía sin pasar por el ValidationPipe, que corre
// después) se asume escala de ciudad -- el default más seguro es exigir
// aval, no autoaprobar por falta de dato.
@Injectable()
export class TerritorialScaleInterceptor implements NestInterceptor {
  constructor(private readonly municipiosService: MunicipiosService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const ciudad: unknown = request.body?.ciudad;

    request.isCityScale =
      typeof ciudad === 'string' && ciudad.trim()
        ? await this.municipiosService.hasMunicipioForCiudad(ciudad)
        : true;

    return next.handle();
  }
}
