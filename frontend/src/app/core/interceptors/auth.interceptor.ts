import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isApiRequest = req.url.startsWith('/api/');
  const token = authService.getToken();

  const authReq =
    isApiRequest && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      const wasAuthenticated = authService.currentUser() !== null;

      if (
        isApiRequest &&
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        wasAuthenticated
      ) {
        authService.logout();
        router.navigateByUrl('/login');
      }

      return throwError(() => error);
    }),
  );
};
