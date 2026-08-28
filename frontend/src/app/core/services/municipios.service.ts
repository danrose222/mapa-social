import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MunicipiosService {
  private readonly baseUrl = '/api/municipios';

  constructor(private readonly http: HttpClient) {}

  // Feedback en tiempo real del selector de localidad en "Registrar una
  // organización": si esta ciudad tiene Municipio registrado, requiere
  // aval de un moderador; si no, se autogestiona.
  checkCiudad(ciudad: string): Observable<{ isCityScale: boolean }> {
    return this.http.get<{ isCityScale: boolean }>(this.baseUrl + '/check', {
      params: { ciudad },
    });
  }
}
