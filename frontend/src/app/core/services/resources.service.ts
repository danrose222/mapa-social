import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateResourcePayload {
  title: string;
  description: string;
  categoryId: number;
  latitude: number;
  longitude: number;
}

export interface Resource extends CreateResourcePayload {
  id: number;
  userId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ResourcesService {
  private readonly http = inject(HttpClient);

  create(payload: CreateResourcePayload): Observable<Resource> {
    return this.http.post<Resource>('/api/resources', payload);
  }
}
