import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  private readonly queryParams = toSignal(this.route.queryParamMap);

  readonly returnPath = computed(() => {
    const volver = this.queryParams()?.get('volver');
    return volver ? `/${volver}` : null;
  });

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService.login(email!, password!).subscribe({
      next: () => {
        this.isSubmitting.set(false);

        // 1. Si venía de una ruta protegida previa, mantenemos ese destino
        const customReturn = this.returnPath();
        if (customReturn) {
          this.router.navigateByUrl(customReturn);
          return;
        }

        // 2. Si no hay ruta previa, leemos actorRole() para redirigir --
        // NO profile()?.role?.name: ese campo solo vale 'seed-role' o
        // 'moderador', 'ong'/'comunidad' viven en organization.type. Con
        // profile().role.name esta comparación nunca era true y cualquier
        // usuario de una organización caía siempre al '/' de abajo.
        const actorRole = this.authService.actorRole();

        if (actorRole === 'moderador') {
          this.router.navigate(['/dashboard-moderador']);
        } else if (actorRole === 'ong' || actorRole === 'comunidad') {
          this.router.navigate(['/dashboard-organizacion']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          error.status === 401
            ? 'Los datos ingresados son incorrectos.'
            : 'No se pudo iniciar sesión. Intentá de nuevo más tarde.',
        );
      },
    });
  }
}