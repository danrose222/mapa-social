import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CreateNeedPayload,
  CreateResourcePayload,
} from '../models/publication.model';

@Injectable({
  providedIn: 'root',
})
export class PublicationsApiService {
  private readonly needsUrl = '/api/needs';
  private readonly resourcesUrl = '/api/resources';

  constructor(private readonly http: HttpClient) {}

  createNeed(
    payload: CreateNeedPayload,
  ): Observable<unknown> {
    return this.http.post(
      this.needsUrl,
      payload,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  createResource(
    payload: CreateResourcePayload,
  ): Observable<unknown> {
    return this.http.post(
      this.resourcesUrl,
      payload,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');

    if (!token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }
}