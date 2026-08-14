import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    phone: ['', [Validators.maxLength(30)]],
  });

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  showPassword = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const {
      firstName,
      lastName,
      email,
      password,
      phone,
    } = this.form.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.http.post('/api/users', {
      firstName,
      lastName,
      email,
      password,
      phone: phone || undefined,
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);

        this.router.navigate(['/login'], {
          queryParams: {
            registered: 'true',
          },
        });
      },

      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);

        if (error.status === 409) {
          this.errorMessage.set(
            'Ya existe un usuario registrado con ese email.',
          );
          return;
        }

        this.errorMessage.set(
          'No se pudo crear la cuenta. Intentá de nuevo más tarde.',
        );
      },
    });
  }
}