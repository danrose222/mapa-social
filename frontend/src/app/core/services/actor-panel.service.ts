import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OngPendingAudit {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

@Injectable({
  providedIn: 'root',
})
export class ActorPanelService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api';

  // --- MUNICIPIO (Auditoría de ONGs) ---
  getPendingOngs(): Observable<OngPendingAudit[]> {
    return this.http.get<OngPendingAudit[]>(`${this.apiUrl}/municipio/audit/ongs`);
  }

  approveOng(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/municipio/audit/ongs/${id}/approve`, {});
  }

  rejectOng(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/municipio/audit/ongs/${id}/reject`, {});
  }

  // --- COMUNIDAD / ONG (Gestión propia) ---
  getMyResources(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/resources/me`);
  }

  getMyNeeds(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/needs/me`);
  }
}