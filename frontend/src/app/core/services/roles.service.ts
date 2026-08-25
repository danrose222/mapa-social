import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface RoleRecord {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly apiUrl = '/api/roles';

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<RoleRecord[]> {
    return this.http.get<RoleRecord[]>(this.apiUrl);
  }
}
