import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ActorStats {
  totalPublicaciones: number;
  solicitudesPendientes: number;
  recursosAsignados: number;
  impactoLocalidad?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ActorPanelService {
  private readonly http = inject(HttpClient);
  // Usa la ruta relativa o la URL base que usen los demás servicios del proyecto
  private readonly apiUrl = '/api'; 

  getOngStats(): Observable<ActorStats> {
    return this.http.get<ActorStats>(`${this.apiUrl}/organizacion/stats`);
  }

  getOngPublicaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/organizacion/publicaciones`);
  }

  getMunicipioStats(): Observable<ActorStats> {
    return this.http.get<ActorStats>(`${this.apiUrl}/municipio/stats`);
  }

  getMunicipioPublicaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/municipio/publicaciones`);
  }
}