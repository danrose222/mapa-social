import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const moderatorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.currentUser()) {
    return router.createUrlTree(['/entrar']);
  }

  // Pedimos el perfil fresco en vez de confiar en el signal ya cacheado --
  // si esto corre justo después de un refresh de página, el perfil todavía
  // puede no haber llegado, y no queremos rebotar a un moderador real por
  // un problema de timing.
  return authService.refreshProfile().pipe(
    map((profile) => (profile?.role.name === 'moderador' ? true : router.createUrlTree(['/']))),
  );
};

