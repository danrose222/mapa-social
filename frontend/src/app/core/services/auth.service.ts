import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';

export type OrganizationType = 'ong' | 'comunidad';

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  ciudad?: string | null;
  organizationType?: OrganizationType | null;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

// Forma de GET /users/me -- trae las relaciones completas (role, organization)
// en vivo desde la base cada vez que se pide, a diferencia del user liviano
// que devuelve /auth/login. Es la fuente de verdad para saber si alguien
// puede publicar un recurso, porque el estado de "organización avalada"
// puede cambiar después de que la persona ya inició sesión.
export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  ciudad?: string | null;
  role: { id: number; name: string };
  organization?: { id: number; name: string; type: OrganizationType; verified: boolean } | null;
  localities?: { id: number; locality: string; provincia?: string }[];
}

const TOKEN_KEY = 'mapa_social_v2_token';
const USER_KEY = 'mapa_social_v2_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly currentUserSignal = signal<AuthUser | null>(this.readStoredUser());
  private readonly profileSignal = signal<UserProfile | null>(null);
  private readonly profileLoadedSignal = signal(false);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly profile = this.profileSignal.asReadonly();
  readonly profileLoaded = this.profileLoadedSignal.asReadonly();

  // true si es moderador, o si pertenece a una organización ya avalada.
  readonly canPublishResource = computed(() => {
    const profile = this.profileSignal();
    if (!profile) {
      return false;
    }
    const isModerator = profile.role.name === 'moderador';
    return isModerator || profile.organization?.verified === true;
  });

  readonly isModerator = computed(() => this.profileSignal()?.role.name === 'moderador');

  // Explica EN QUÉ CONDICIÓN puede (o no puede) publicar -- para mostrarlo
  // en la UI en vez de un simple sí/no.
  readonly resourcePublishReason = computed(() => {
    const profile = this.profileSignal();

    if (!profile) {
      return null;
    }

    if (profile.role.name === 'moderador') {
      return 'Podés publicar porque tu cuenta es de moderador.';
    }

    if (profile.organization?.verified) {
      return `Podés publicar en nombre de ${profile.organization.name}, ya avalada.`;
    }

    if (profile.organization && !profile.organization.verified) {
      return `${profile.organization.name} todavía no fue avalada por un moderador.`;
    }

    return 'Tu cuenta no pertenece a ninguna organización avalada.';
  });

  constructor() {
    if (this.getToken()) {
      this.refreshProfile().subscribe();
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
      tap((response) => {
        sessionStorage.setItem(TOKEN_KEY, response.access_token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(response.user));
        this.currentUserSignal.set(response.user);
      }),
      tap(() => this.refreshProfile().subscribe()),
    );
  }

  refreshProfile(): Observable<UserProfile | null> {
    return this.http.get<UserProfile>('/api/users/me').pipe(
      tap((profile) => {
        this.profileSignal.set(profile);
        this.profileLoadedSignal.set(true);
      }),
      catchError(() => {
        this.profileSignal.set(null);
        this.profileLoadedSignal.set(true);
        return of(null);
      }),
    );
  }

  register(payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    ciudad?: string;
  }): Observable<unknown> {
    return this.http.post('/api/users', payload);
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.currentUserSignal.set(null);
    this.profileSignal.set(null);
    this.profileLoadedSignal.set(false);
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  private readStoredUser(): AuthUser | null {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
