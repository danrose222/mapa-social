import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import {
  LocalityAutocompleteComponent,
  LocalitySelection,
} from '../../shared/components/locality-autocomplete/locality-autocomplete.component';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LocalityAutocompleteComponent],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.scss',
})
export class RegistroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    phone: ['', [Validators.maxLength(30)]],
    ciudad: [''],
  });

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  onCiudadSelected(selection: LocalitySelection): void {
    this.form.patchValue({ ciudad: selection.locality });
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { firstName, lastName, email, password, phone, ciudad } = this.form.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService
      .register({
        firstName: firstName!,
        lastName: lastName!,
        email: email!,
        password: password!,
        phone: phone || undefined,
        ciudad: ciudad || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/entrar'], { queryParams: { registrado: 'true' } });
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            error.status === 409
              ? 'Ya existe un usuario registrado con ese email.'
              : 'No se pudo crear la cuenta. Intentá de nuevo más tarde.',
          );
        },
      });
  }
}
