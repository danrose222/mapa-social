import { Component, HostListener, OnDestroy, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../core/services/auth.service';

// Perfiles con los que alguien puede llegar al login desde el navbar: cada
// uno le pasa a la pantalla de login un ?tipo= para que ajuste el texto y
// ofrezca el link de registro que corresponda (comunidad/ong/municipio). El
// icono reutiliza el mismo criterio que AuthService.iconoRol(), para que la
// opción que alguien elige acá sea el mismo icono que después ve como su
// propio saludo en el navbar.
export const PERFILES_LOGIN = [
  { tipo: 'persona', titulo: 'Vecino / Usuario', icono: 'person' },
  { tipo: 'comunidad', titulo: 'Comunidad', icono: 'home' },
  { tipo: 'ong', titulo: 'ONG', icono: 'apartment' },
  { tipo: 'moderador', titulo: 'Municipio', icono: 'account_balance' },
] as const;

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatToolbarModule,
    MatIconModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;
  readonly perfilesLogin = PERFILES_LOGIN;
  readonly mostrarModalLogin = signal(false);

  isMenuOpen = false;

  nombreMostrado(): string {
    return this.authService.nombreParaMostrar();
  }

  iconoRolActual(): string {
    return this.authService.iconoRol();
  }

  // Mismo criterio "por descarte" que usa Inicio (ver inicio.ts): un
  // ciudadano logueado no es comunidad/ong ni moderador. Se usa para
  // ocultarle el link de registro de comunidad/ONG, que ya no le sirve
  // (esa cuenta ya existe como usuario común).
  esCiudadano(): boolean {
    const rol = this.currentUser()?.role;
    return !!rol && rol !== 'comunidad' && rol !== 'ong' && rol !== 'moderador';
  }

  logout(): void {
    this.authService.logout();
    this.closeMenu();
    this.router.navigateByUrl('/');
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    this.syncBodyScrollLock();
  }

  closeMenu(): void {
    if (!this.isMenuOpen) {
      return;
    }
    this.isMenuOpen = false;
    this.syncBodyScrollLock();
  }

  abrirModalLogin(): void {
    this.closeMenu();
    this.mostrarModalLogin.set(true);
  }

  cerrarModalLogin(): void {
    this.mostrarModalLogin.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeMenu();
    this.cerrarModalLogin();
  }

  ngOnDestroy(): void {
    document.body.classList.remove('mobile-menu-open');
  }

  private syncBodyScrollLock(): void {
    document.body.classList.toggle('mobile-menu-open', this.isMenuOpen);
  }
}
