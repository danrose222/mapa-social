import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Organization {
  id: number;
  name: string;
  description?: string;
  contactInfo?: string;
  address?: string;
  type: string;
  ciudad: string;
  verified: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class OrganizationsService {
  private readonly apiUrl = '/api/organizations';

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Organization[]> {
    return this.http.get<Organization[]>(this.apiUrl);
  }

  approve(id: number): Observable<Organization> {
    return this.http.patch<Organization>(
      `${this.apiUrl}/${id}`,
      {
        verified: true,
      },
    );
  }

  reject(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`,
    );
  }
}