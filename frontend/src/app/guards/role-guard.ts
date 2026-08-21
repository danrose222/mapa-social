import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // 1. Si todavía no hay token guardado, redirigir directo
    if (!authService.getToken()) {
      return router.createUrlTree(['/login']);
    }

    // 2. Si hay token pero el perfil sigue cargando, permitimos el paso temporalmente
    // o esperamos la carga para no rebotar al usuario por falso positivo
    if (!authService.profileLoaded()) {
      return true;
    }

    const profile = authService.profile();
    const userRole = profile?.role?.name;

    // 3. Validar el rol
    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    // 4. Si el perfil ya cargó y el rol no coincide
    return router.createUrlTree(['/unauthorized']);
  };
};