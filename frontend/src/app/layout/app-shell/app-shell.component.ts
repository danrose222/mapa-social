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

  // Signal computada: obtiene la URL del dashboard según el rol del perfil
  readonly dashboardUrl = computed(() => {
    const role = this.authService.profile()?.role?.name;

    if (role === 'moderador') {
      return '/dashboard-moderador';
    }
    if (role === 'ong' || role === 'comunidad') {
      return '/dashboard-organizacion';
    }
    return null;
  });

  readonly isMenuOpen = signal(false);

  toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
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