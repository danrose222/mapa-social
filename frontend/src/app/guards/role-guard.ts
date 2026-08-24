import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../core/services/auth.service';

// Compara contra AuthService.actorRole (derivado), no contra
// profile.role.name directo -- 'ong'/'comunidad' viven en
// organization.type, no en el rol del usuario (ver el comentario en
// AuthService.actorRole).
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // 1. Sin token guardado, directo al login real (no /login -- esa ruta
    // no existe en esta app, es /entrar).
    if (!authService.getToken()) {
      return router.createUrlTree(['/entrar']);
    }

    // 2. Esperar a que el perfil termine de cargar antes de decidir --
    // "dejar pasar mientras tanto" significa que un hard refresh sobre una
    // ruta protegida saltea el chequeo de rol la primera vez que corre el
    // guard, porque profileLoaded() todavía es false en ese momento.
    return toObservable(authService.profileLoaded).pipe(
      filter((loaded) => loaded),
      take(1),
      map(() => {
        const actorRole = authService.actorRole();

        if (actorRole && allowedRoles.includes(actorRole)) {
          return true;
        }

        return router.createUrlTree(['/unauthorized']);
      }),
    );
  };
};
