import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateNeedPayload {
  title: string;
  description: string;
  categoryId: number;
  latitude: number;
  longitude: number;
}

export interface Need extends CreateNeedPayload {
  id: number;
  userId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class NeedsService {
  private readonly http = inject(HttpClient);

  create(payload: CreateNeedPayload): Observable<Need> {
    return this.http.post<Need>('/api/needs', payload);
  }
}
