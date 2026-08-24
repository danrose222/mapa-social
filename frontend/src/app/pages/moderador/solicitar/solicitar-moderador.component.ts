import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ModeratorRequestsService } from '../../../core/services/moderator-requests.service';
import {
  LocalityAutocompleteComponent,
  LocalitySelection,
} from '../../../shared/components/locality-autocomplete/locality-autocomplete.component';

@Component({
  selector: 'app-solicitar-moderador',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LocalityAutocompleteComponent],
  templateUrl: './solicitar-moderador.component.html',
  styleUrl: './solicitar-moderador.component.scss',
})
export class SolicitarModeradorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly moderatorRequestsService = inject(ModeratorRequestsService);

  readonly isModerator = this.authService.isModerator;

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly submitted = signal(false);

  private provincia = '';

  readonly form = this.fb.group({
    locality: ['', [Validators.required]],
    institutionName: ['', [Validators.required, Validators.maxLength(150)]],
    position: ['', [Validators.required, Validators.maxLength(150)]],
    officialEmail: ['', [Validators.required, Validators.email]],
    officialPhone: ['', [Validators.required, Validators.maxLength(30)]],
    justification: [''],
    acceptTerms: [false, [Validators.requiredTrue]],
  });

  onLocalitySelected(selection: LocalitySelection): void {
    this.form.patchValue({ locality: selection.locality });
    this.provincia = selection.provincia;
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.moderatorRequestsService
      .create({
        locality: raw.locality!,
        provincia: this.provincia || undefined,
        institutionName: raw.institutionName!,
        position: raw.position!,
        officialEmail: raw.officialEmail!,
        officialPhone: raw.officialPhone!,
        justification: raw.justification || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submitted.set(true);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            error.status === 409
              ? 'Ya tenés una solicitud pendiente -- revisá tu email institucional para confirmarla.'
              : error.status === 403
                ? (error.error?.message ?? 'No se pudo enviar la solicitud.')
                : 'No se pudo enviar la solicitud. Intentá de nuevo más tarde.',
          );
        },
      });
  }
}
