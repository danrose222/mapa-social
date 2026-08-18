import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CreateNeedPayload,
  CreateResourcePayload,
  Need,
  Resource,
  Solicitud,
} from '../models/mapa-social.model';

export interface NeedLocality {
  locality: string;
  count: number;
}

export interface PaginatedNeeds {
  items: Need[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class PublicationsService {
  private readonly needsUrl = '/api/needs';
  private readonly resourcesUrl = '/api/resources';

  constructor(private readonly http: HttpClient) {}

  getNeeds(): Observable<Need[]> {
    return this.http.get<Need[]>(this.needsUrl);
  }

  getNeedLocalities(): Observable<NeedLocality[]> {
    return this.http.get<NeedLocality[]>(`${this.needsUrl}/localities`);
  }

  searchNeeds(params: {
    locality?: string;
    category?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    page?: number;
    limit?: number;
  }): Observable<PaginatedNeeds> {
    let httpParams = new HttpParams();
    if (params.locality) httpParams = httpParams.set('locality', params.locality);
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.lat !== undefined) httpParams = httpParams.set('lat', params.lat);
    if (params.lng !== undefined) httpParams = httpParams.set('lng', params.lng);
    if (params.radius !== undefined) httpParams = httpParams.set('radius', params.radius);
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.limit) httpParams = httpParams.set('limit', params.limit);

    return this.http.get<PaginatedNeeds>(`${this.needsUrl}/search`, { params: httpParams });
  }

  // Matching: recursos sugeridos para una necesidad (misma categoría,
  // dentro de un radio -- default 15km del lado del backend).
  getMatches(needId: number, radius?: number): Observable<Resource[]> {
    let httpParams = new HttpParams();
    if (radius !== undefined) httpParams = httpParams.set('radius', radius);
    return this.http.get<Resource[]>(`${this.needsUrl}/${needId}/matches`, {
      params: httpParams,
    });
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
