import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CollaborationRequest,
  CreateCollaborationRequestPayload,
  CreateNeedPayload,
  CreatePrivateNeedPayload,
  CreateResourcePayload,
  CreateResourceRequestPayload,
  Need,
  Resource,
  ResourceRequest,
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

  // Estado vacío de búsqueda -> "publicá tu necesidad": nunca aparece en
  // el mapa público (ver comentario en needs.service.ts del backend).
  createPrivateNeed(payload: CreatePrivateNeedPayload): Observable<Need> {
    return this.http.post<Need>(`${this.needsUrl}/private`, payload);
  }

  // Bandeja de necesidades privadas para un moderador o una organización
  // avalada -- ver mi-organizacion.component.ts.
  getPrivateNeedsQueue(): Observable<Need[]> {
    return this.http.get<Need[]>(`${this.needsUrl}/privadas`);
  }

  getResources(): Observable<Resource[]> {
    return this.http.get<Resource[]>(this.resourcesUrl);
  }

  getMyNeeds(): Observable<Need[]> {
    return this.http.get<Need[]>(`${this.needsUrl}/mias`);
  }

  getMyResources(): Observable<Resource[]> {
    return this.http.get<Resource[]>(`${this.resourcesUrl}/mias`);
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

  // "Quiero Colaborar": mensaje anónimo hacia la organización dueña del
  // recurso -- público, sin necesidad de sesión.
  contactAboutResource(
    resourceId: number,
    payload: CreateCollaborationRequestPayload,
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.resourcesUrl}/${resourceId}/contact`,
      payload,
    );
  }

  // Bandeja de mensajes de colaboración recibidos por mi organización.
  getMyCollaborationRequests(): Observable<CollaborationRequest[]> {
    return this.http.get<CollaborationRequest[]>(
      `${this.resourcesUrl}/collaboration-requests/mine`,
    );
  }

  // Solicitud "express" de un usuario logueado hacia un recurso puntual --
  // contacto y categoría se heredan de la cuenta y el recurso.
  requestResource(
    resourceId: number,
    payload: CreateResourceRequestPayload,
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.resourcesUrl}/${resourceId}/request`,
      payload,
    );
  }

  // Bandeja de solicitudes express recibidas por mi organización.
  getMyResourceRequests(): Observable<ResourceRequest[]> {
    return this.http.get<ResourceRequest[]>(`${this.resourcesUrl}/requests/mine`);
  }

  // "Mi Actividad": las solicitudes express que YO mandé.
  getMySentResourceRequests(): Observable<ResourceRequest[]> {
    return this.http.get<ResourceRequest[]>(`${this.resourcesUrl}/requests/sent`);
  }
}
