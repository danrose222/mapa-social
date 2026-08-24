import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ManagedUserLocality {
  id: number;
  locality: string;
  provincia?: string;
}

export interface ManagedUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: { id: number; name: string };
  organization?: { id: number; name: string } | null;
  localities?: ManagedUserLocality[];
}

// Endpoints de gestión de usuarios -- todos exigen rol moderador en el
// backend (ver users.controller.ts), no hace falta repetir ese chequeo acá.
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly apiUrl = '/api/users';

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<ManagedUser[]> {
    return this.http.get<ManagedUser[]>(this.apiUrl);
  }

  setRole(userId: number, roleId: number): Observable<ManagedUser> {
    return this.http.patch<ManagedUser>(`${this.apiUrl}/${userId}`, { roleId });
  }
}
