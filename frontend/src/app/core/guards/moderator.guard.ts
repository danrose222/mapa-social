import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
} from '@angular/router';

import { AuthService } from '../services/auth.service';

export const moderatorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();

  if (!user) {
    return router.createUrlTree(['/login'], {
      queryParams: {
        authRequired: 'true',
      },
    });
  }

  if (user.role === 'moderador') {
    return true;
  }

  return router.createUrlTree(['/']);
};