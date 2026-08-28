import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

type VerifyState = 'checking' | 'success' | 'error';

@Component({
  selector: 'app-verificar-email',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verificar-email.component.html',
  styleUrl: './verificar-email.component.scss',
})
export class VerificarEmailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;

  readonly state = signal<VerifyState>('checking');
  readonly errorMessage = signal('');

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.state.set('error');
      this.errorMessage.set('Falta el token de verificación en el enlace.');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.state.set('success');
        // El perfil pudo haberse cargado antes de verificar (ej: la
        // persona ya estaba logueada en otra pestaña) -- lo refrescamos
        // para que emailVerified quede al día sin pedirle recargar.
        this.authService.refreshProfile().subscribe();
      },
      error: (error: HttpErrorResponse) => {
        this.state.set('error');
        this.errorMessage.set(
          error.error?.message ?? 'No se pudo verificar la cuenta. Intentá de nuevo más tarde.',
        );
      },
    });
  }
}
