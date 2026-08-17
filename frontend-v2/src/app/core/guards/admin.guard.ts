import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.currentUser()) {
    return router.createUrlTree(['/entrar']);
  }

  return authService
    .refreshProfile()
    .pipe(map((profile) => (profile?.role.name === 'admin' ? true : router.createUrlTree(['/']))));
};
