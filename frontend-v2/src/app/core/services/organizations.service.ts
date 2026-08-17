import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Organization } from '../models/mapa-social.model';

export interface CreateOrganizationPayload {
  name: string;
  type: 'comunidad' | 'ong';
  ciudad: string;
  description?: string;
  contactInfo?: string;
  address?: string;
}

export interface UpdateOrganizationPayload {
  name?: string;
  description?: string;
  contactInfo?: string;
  address?: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizationsService {
  private readonly baseUrl = '/api/organizations';

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Organization[]> {
    return this.http.get<Organization[]>(this.baseUrl);
  }

  getOne(id: number): Observable<Organization> {
    return this.http.get<Organization>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateOrganizationPayload): Observable<Organization> {
    return this.http.post<Organization>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateOrganizationPayload): Observable<Organization> {
    return this.http.patch<Organization>(`${this.baseUrl}/${id}`, payload);
  }

  approve(id: number): Observable<Organization> {
    return this.http.patch<Organization>(`${this.baseUrl}/${id}`, { verified: true });
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}
