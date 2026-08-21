import { Component, HostListener, inject, signal } from '@angular/core';
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

  readonly isMenuOpen = signal(false);
  readonly isUserMenuOpen = signal(false);
  readonly isModeratorMenuOpen = signal(false);

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