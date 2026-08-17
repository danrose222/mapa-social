import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateNeedPayload, Need, Resource } from '../models/mapa-social.model';

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
}
