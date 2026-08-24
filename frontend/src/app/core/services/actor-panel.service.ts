import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Need, Resource } from '../models/mapa-social.model';

// Métricas propias para el panel de ONG/Comunidad -- reusa los mismos
// endpoints que ya usa mis-publicaciones.component.ts (/resources/mias,
// /needs/mias), no una ruta separada. Municipio no tiene ningún panel acá
// (ver el comentario en dashboard-organizacion.ts).
@Injectable({
  providedIn: 'root',
})
export class ActorPanelService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api';

  getMyResources(): Observable<Resource[]> {
    return this.http.get<Resource[]>(`${this.apiUrl}/resources/mias`);
  }

  getMyNeeds(): Observable<Need[]> {
    return this.http.get<Need[]>(`${this.apiUrl}/needs/mias`);
  }
}
