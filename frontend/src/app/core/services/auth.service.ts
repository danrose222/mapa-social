import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  estadoAyuda?: 'estable' | 'critico';
  organizationName?: string;
  ciudad?: string;
  latitude?: number;
  longitude?: number;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'mapa_social_token';
const USER_KEY = 'mapa_social_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSignal = signal<AuthUser | null>(
    this.readStoredUser(),
  );

  readonly currentUser = this.currentUserSignal.asReadonly();

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>('/api/auth/login', { email, password })
      .pipe(
        tap((response) => {
          sessionStorage.setItem(TOKEN_KEY, response.access_token);
          sessionStorage.setItem(USER_KEY, JSON.stringify(response.user));
          this.currentUserSignal.set(response.user);
        }),
      );
  }

  actualizarUsuarioActual(cambios: Partial<AuthUser>): void {
    const actual = this.currentUserSignal();

    if (!actual) {
      return;
    }

    const actualizado = { ...actual, ...cambios };

    sessionStorage.setItem(USER_KEY, JSON.stringify(actualizado));
    this.currentUserSignal.set(actualizado);
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.currentUserSignal.set(null);
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  // Una comunidad/ong se identifica por el nombre de la organización, no
  // por el nombre de la persona que la registró (ese es el responsable).
  nombreParaMostrar(): string {
    const usuario = this.currentUserSignal();

    if (!usuario) {
      return '';
    }

    return usuario.organizationName || `${usuario.firstName} ${usuario.lastName}`;
  }

  // Mismo criterio visual que los pines del mapa: comunidad = casa,
  // ong = edificio. El moderador (municipio) usa un edificio publico para
  // distinguirse del edificio "comun" de una ong, y el ciudadano (rol seed,
  // sin nombre propio en la base) usa una persona.
  iconoRol(): string {
    const rol = this.currentUserSignal()?.role;

    if (rol === 'moderador') {
      return 'account_balance';
    }

    if (rol === 'comunidad') {
      return 'home';
    }

    if (rol === 'ong') {
      return 'apartment';
    }

    return 'person';
  }

  private readStoredUser(): AuthUser | null {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
