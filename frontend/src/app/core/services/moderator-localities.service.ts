import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ModeratorLocalityRecord {
  id: number;
  userId: number;
  locality: string;
  provincia?: string;
}

@Injectable({ providedIn: 'root' })
export class ModeratorLocalitiesService {
  constructor(private readonly http: HttpClient) {}

  add(
    userId: number,
    payload: { locality: string; provincia?: string },
  ): Observable<ModeratorLocalityRecord> {
    return this.http.post<ModeratorLocalityRecord>(
      `/api/users/${userId}/localities`,
      payload,
    );
  }

  remove(userId: number, localityId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `/api/users/${userId}/localities/${localityId}`,
    );
  }
}
