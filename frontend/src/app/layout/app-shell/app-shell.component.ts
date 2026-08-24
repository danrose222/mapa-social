import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;
  readonly isModerator = this.authService.isModerator;

  // 'moderador' y 'ong'/'comunidad' viven en campos distintos del perfil
  // (role.name vs organization.type) -- actorRole() ya resuelve esa
  // distinción, ver AuthService.
  readonly dashboardUrl = computed(() => {
    const role = this.authService.actorRole();

    if (role === 'moderador') {
      return '/dashboard-moderador';
    }
    if (role === 'ong' || role === 'comunidad') {
      return '/dashboard-organizacion';
    }
    return null;
  });

  readonly isMenuOpen = signal(false);
  readonly isAccountMenuOpen = signal(false);

  toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
    this.isAccountMenuOpen.set(false);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
    this.isAccountMenuOpen.set(false);
  }

  // stopPropagation acá, no en el listener de document -- si no, el mismo
  // click que abre el menú llega también al listener de document y lo
  // vuelve a cerrar en el mismo evento.
  toggleAccountMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isAccountMenuOpen.update((open) => !open);
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

  // Cierra el dropdown de cuenta al clickear afuera. El trigger hace
  // stopPropagation en su propio handler, y el panel también en el suyo,
  // así que cualquier click que llegue hasta acá es necesariamente "afuera".
  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.isAccountMenuOpen()) {
      this.isAccountMenuOpen.set(false);
    }
  }
}
