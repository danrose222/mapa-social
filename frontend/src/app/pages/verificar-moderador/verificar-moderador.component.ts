import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ModeratorRequestsService } from '../../core/services/moderator-requests.service';

type VerifyState = 'checking' | 'success' | 'error';

@Component({
  selector: 'app-verificar-moderador',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verificar-moderador.component.html',
  styleUrl: './verificar-moderador.component.scss',
})
export class VerificarModeradorComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly moderatorRequestsService = inject(ModeratorRequestsService);

  readonly currentUser = this.authService.currentUser;

  readonly state = signal<VerifyState>('checking');
  readonly errorMessage = signal('');
  readonly locality = signal('');

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.state.set('error');
      this.errorMessage.set('Falta el token de verificación en el enlace.');
      return;
    }

    this.moderatorRequestsService.verify(token).subscribe({
      next: (result) => {
        this.state.set('success');
        this.locality.set(result.locality);
        // Si quien confirma ya está logueado en esta pestaña con la misma
        // cuenta, refrescamos el perfil para que el rol nuevo se refleje
        // sin pedirle recargar -- mismo patrón que verificar-email.
        if (this.currentUser()) {
          this.authService.refreshProfile().subscribe();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.state.set('error');
        this.errorMessage.set(
          error.error?.message ?? 'No se pudo confirmar el pedido. Intentá de nuevo más tarde.',
        );
      },
    });
  }
}
