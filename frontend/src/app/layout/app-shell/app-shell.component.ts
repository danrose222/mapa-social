import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { OrganizationsService } from '../../core/services/organizations.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { localitiesMatch } from '../../shared/utils/locality-match.util';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);
  private readonly organizationsService = inject(OrganizationsService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;
  readonly isModerator = this.authService.isModerator;
  readonly belongsToOrganization = this.authService.belongsToOrganization;
  readonly emailVerified = this.authService.emailVerified;

  readonly isResendingVerification = signal(false);
  readonly verificationResent = signal(false);

  readonly isMenuOpen = signal(false);
  readonly isUserMenuOpen = signal(false);
  readonly isModeratorMenuOpen = signal(false);

  // El aval de una organización no es "mágico": este contador la hace
  // visible como tarea pendiente sin que el moderador tenga que entrar a
  // /moderador/organizaciones a revisar. No hay tabla de notificaciones en
  // el backend -- la propia fila verified:false ya es el registro, esto
  // solo la resume acá con el mismo filtro por jurisdicción que usa esa
  // pantalla (organizaciones-moderador.component.ts).
  readonly pendingOrgCount = signal(0);

  constructor() {
    // El propio AuthService intenta refrescar el perfil una sola vez al
    // construirse, pero no siempre llega a tiempo antes de que este shell
    // (montado en la raíz de toda la app) lea belongsToOrganization()/
    // isModerator() para decidir qué mostrar en el nav -- mismo problema ya
    // parcheado en MiOrganizacionComponent y ResourceRequestModalComponent.
    // Sin este refresco propio, "Mi espacio" vs "Panel Institucional" podía
    // quedar mostrando el estado viejo hasta la próxima navegación.
    if (this.currentUser()) {
      this.authService.refreshProfile().subscribe((profile) => {
        if (!this.isModerator()) {
          return;
        }

        const myLocalities = (profile?.localities ?? []).map((l) => l.locality);
        if (myLocalities.length === 0) {
          return;
        }

        this.organizationsService.getAll().subscribe({
          next: (organizations) => {
            const count = organizations.filter(
              (org) =>
                !org.verified && myLocalities.some((mine) => localitiesMatch(mine, org.ciudad)),
            ).length;
            this.pendingOrgCount.set(count);
          },
          error: () => {},
        });
      });
    }
  }

  resendVerification(): void {
    if (this.isResendingVerification()) {
      return;
    }

    this.isResendingVerification.set(true);
    this.authService.resendVerification().subscribe({
      next: () => {
        this.isResendingVerification.set(false);
        this.verificationResent.set(true);
      },
      error: () => {
        this.isResendingVerification.set(false);
      },
    });
  }

  toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((open) => !open);
    this.isModeratorMenuOpen.set(false);
  }

  toggleModeratorMenu(): void {
    this.isModeratorMenuOpen.update((open) => !open);
    this.isUserMenuOpen.set(false);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
    this.isUserMenuOpen.set(false);
    this.isModeratorMenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.closeMenu();
    this.router.navigateByUrl('/');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }
}