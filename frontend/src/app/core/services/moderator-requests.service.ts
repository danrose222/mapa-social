import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CreateModeratorRequestPayload {
  locality: string;
  provincia?: string;
  institutionName: string;
  position: string;
  officialEmail: string;
  officialPhone: string;
  justification?: string;
}

export interface ModeratorRequestRecord extends CreateModeratorRequestPayload {
  id: number;
  userId: number;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ModeratorRequestsService {
  private readonly apiUrl = '/api/users';

  constructor(private readonly http: HttpClient) {}

  create(payload: CreateModeratorRequestPayload): Observable<ModeratorRequestRecord> {
    return this.http.post<ModeratorRequestRecord>(
      `${this.apiUrl}/me/moderator-requests`,
      payload,
    );
  }

  getAll(): Observable<ModeratorRequestRecord[]> {
    return this.http.get<ModeratorRequestRecord[]>(`${this.apiUrl}/moderator-requests`);
  }

  approve(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.apiUrl}/moderator-requests/${id}/approve`,
      {},
    );
  }

  reject(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/moderator-requests/${id}`);
  }
}
