import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { toSignal } from '@angular/core/rxjs-interop';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  HttpErrorResponse,
} from '@angular/common/http';

import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  AuthService,
} from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);

  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  readonly form = this.fb.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email,
      ],
    ],

    password: [
      '',
      [
        Validators.required,
        Validators.minLength(6),
      ],
    ],
  });

  private readonly queryParams =
    toSignal(this.route.queryParamMap);

  readonly authRequiredMessage = computed(() =>
    this.queryParams()?.get('authRequired') === 'true'
      ? 'Iniciá sesión para continuar.'
      : null,
  );

  readonly registeredMessage = computed(() =>
    this.queryParams()?.get('registered') === 'true'
      ? 'Cuenta creada correctamente. Ya podés iniciar sesión.'
      : null,
  );

  readonly isSubmitting = signal(false);

  readonly errorMessage = signal('');

  showPassword = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    if (
      this.form.invalid ||
      this.isSubmitting()
    ) {
      this.form.markAllAsTouched();
      return;
    }

    const {
      email,
      password,
    } = this.form.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService
      .login(email!, password!)
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);

          this.router.navigateByUrl('/');
        },

        error: (
          error: HttpErrorResponse,
        ) => {
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