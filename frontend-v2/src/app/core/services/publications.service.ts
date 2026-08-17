import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CreateNeedPayload,
  CreateResourcePayload,
  Need,
  Resource,
  Solicitud,
} from '../models/mapa-social.model';

@Injectable({ providedIn: 'root' })
export class PublicationsService {
  private readonly needsUrl = '/api/needs';
  private readonly resourcesUrl = '/api/resources';

  constructor(private readonly http: HttpClient) {}

  getNeeds(): Observable<Need[]> {
    return this.http.get<Need[]>(this.needsUrl);
  }

  getNeed(id: number): Observable<Need> {
    return this.http.get<Need>(`${this.needsUrl}/${id}`);
  }

  createNeed(payload: CreateNeedPayload): Observable<Need> {
    return this.http.post<Need>(this.needsUrl, payload);
  }

  getResources(): Observable<Resource[]> {
    return this.http.get<Resource[]>(this.resourcesUrl);
  }

  createResource(payload: CreateResourcePayload): Observable<Resource> {
    return this.http.post<Resource>(this.resourcesUrl, payload);
  }

  updateNeedStatus(id: number, status: string): Observable<Need> {
    return this.http.patch<Need>(`${this.needsUrl}/${id}`, { status });
  }

  setRequiresSolicitud(id: number, requiresSolicitud: boolean): Observable<Need> {
    return this.http.patch<Need>(`${this.needsUrl}/${id}`, { requiresSolicitud });
  }

  removeNeed(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.needsUrl}/${id}`);
  }

  updateResourceStatus(id: number, status: string): Observable<Resource> {
    return this.http.patch<Resource>(`${this.resourcesUrl}/${id}`, { status });
  }

  removeResource(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.resourcesUrl}/${id}`);
  }

  createSolicitud(needId: number, message?: string): Observable<Solicitud> {
    return this.http.post<Solicitud>(`${this.needsUrl}/${needId}/solicitudes`, { message });
  }

  getSolicitudesForNeed(needId: number): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(`${this.needsUrl}/${needId}/solicitudes`);
  }

  updateSolicitudStatus(
    needId: number,
    solicitudId: number,
    status: 'accepted' | 'rejected',
  ): Observable<Solicitud> {
    return this.http.patch<Solicitud>(
      `${this.needsUrl}/${needId}/solicitudes/${solicitudId}`,
      { status },
    );
  }

  getMySolicitudes(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>('/api/solicitudes/mias');
  }
}
