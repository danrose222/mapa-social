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
    if (this.isModerator()) {
      this.authService.refreshProfile().subscribe((profile) => {
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