import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface LocalityRequestRecord {
  id: number;
  userId: number;
  locality: string;
  provincia?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  respondedAt?: string;
  user?: { id: number; firstName: string; lastName: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class LocalityRequestsService {
  private readonly baseUrl = '/api/locality-requests';

  constructor(private readonly http: HttpClient) {}

  create(payload: { locality: string; provincia?: string }): Observable<LocalityRequestRecord> {
    return this.http.post<LocalityRequestRecord>(this.baseUrl, payload);
  }

  findMine(): Observable<LocalityRequestRecord[]> {
    return this.http.get<LocalityRequestRecord[]>(`${this.baseUrl}/mias`);
  }

  findPending(): Observable<LocalityRequestRecord[]> {
    return this.http.get<LocalityRequestRecord[]>(this.baseUrl);
  }

  respond(id: number, status: 'approved' | 'rejected'): Observable<LocalityRequestRecord> {
    return this.http.patch<LocalityRequestRecord>(`${this.baseUrl}/${id}`, { status });
  }
}
