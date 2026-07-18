import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private user: any = null;

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/login`, { email, password }, { withCredentials: true }).pipe(
      tap((res: any) => {
        this.user = res.user;
      }),
    );
  }

  register(email: string, password: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/register`, { email, password }, { withCredentials: true }).pipe(
      tap((res: any) => {
        this.user = res.user;
      }),
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.user = null;
      }),
      catchError((error) => {
        this.user = null;
        return throwError(() => error);
      }),
    );
  }

  getMe(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/auth/me`, { withCredentials: true }).pipe(
      tap((res: any) => {
        this.user = res.user;
      }),
      catchError((error) => {
        this.user = null;
        return throwError(() => error);
      }),
    );
  }

  setUser(user: any): void {
    this.user = user;
  }

  getUser(): any {
    return this.user;
  }
}
