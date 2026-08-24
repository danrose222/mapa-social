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
}

export interface VerifyModeratorRequestResult {
  message: string;
  locality: string;
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

  verify(token: string): Observable<VerifyModeratorRequestResult> {
    return this.http.post<VerifyModeratorRequestResult>(
      `${this.apiUrl}/moderator-requests/verify`,
      { token },
    );
  }
}
