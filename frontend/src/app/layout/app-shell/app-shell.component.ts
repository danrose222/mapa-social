import { Component, ElementRef, HostListener, effect, inject, signal } from '@angular/core';
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
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly currentUser = this.authService.currentUser;
  readonly isModerator = this.authService.isModerator;
  readonly belongsToOrganization = this.authService.belongsToOrganization;
  readonly emailVerified = this.authService.emailVerified;

  readonly isResendingVerification = signal(false);
  readonly verificationResent = signal(false);

  readonly isMenuOpen = signal(false);
  readonly isAccountMenuOpen = signal(false);

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
      this.authService.refreshProfile().subscribe();
    }

    // effect() en vez de correr esto una sola vez atado al refreshProfile()
    // de arriba: como AppShellComponent es la raíz de toda la app (nunca se
    // destruye entre navegaciones), un login o una promoción a moderador
    // DENTRO de la misma sesión (sin recargar la página) nunca volvía a
    // disparar este fetch -- el badge de pendientes quedaba en 0 para
    // siempre aunque isModerator() ya reflejara el rol nuevo. Así, corre de
    // nuevo cada vez que cambia el perfil (login, logout, promoción).
    effect(() => {
      if (!this.isModerator()) {
        this.pendingOrgCount.set(0);
        return;
      }

      const myLocalities = (this.authService.profile()?.localities ?? []).map(
        (l) => l.locality,
      );
      if (myLocalities.length === 0) {
        this.pendingOrgCount.set(0);
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

  // Sin esto, la única forma de cerrar el dropdown era Escape o un link
  // adentro -- clickear el mapa o cualquier otra zona de la página lo
  // dejaba abierto flotando sobre el contenido hasta que el usuario
  // notara y lo cerrara a mano.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isAccountMenuOpen()) {
      return;
    }

    const dropdown = this.elementRef.nativeElement.querySelector('.shell-header__dropdown');

    if (dropdown && event.target instanceof Node && !dropdown.contains(event.target)) {
      this.isAccountMenuOpen.set(false);
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

  toggleAccountMenu(): void {
    this.isAccountMenuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
    this.isAccountMenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.closeMenu();
    // AppShellComponent nunca se destruye entre logout/login (es la raíz
    // de toda la app) -- sin este reset, la siguiente cuenta que inicia
    // sesión en la misma pestaña veía "ya te reenviamos el correo" aunque
    // nunca hubiera pedido nada.
    this.isResendingVerification.set(false);
    this.verificationResent.set(false);
    this.router.navigateByUrl('/');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }
}