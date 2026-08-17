import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { OrganizationsService } from '../../../core/services/organizations.service';
import {
  LocalityAutocompleteComponent,
  LocalitySelection,
} from '../../../shared/components/locality-autocomplete/locality-autocomplete.component';

@Component({
  selector: 'app-crear-organizacion',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LocalityAutocompleteComponent],
  templateUrl: './crear-organizacion.component.html',
  styleUrl: './crear-organizacion.component.scss',
})
export class CrearOrganizacionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly organizationsService = inject(OrganizationsService);
  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly submitted = signal(false);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    type: ['comunidad' as 'comunidad' | 'ong', [Validators.required]],
    ciudad: ['', [Validators.required]],
    description: [''],
    contactInfo: [''],
    address: [''],
  });

  onLocalitySelected(selection: LocalitySelection): void {
    this.form.patchValue({ ciudad: selection.locality });
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.organizationsService
      .create({
        name: raw.name!,
        type: raw.type!,
        ciudad: raw.ciudad!,
        description: raw.description || undefined,
        contactInfo: raw.contactInfo || undefined,
        address: raw.address || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submitted.set(true);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            error.status === 401
              ? 'Tu sesión expiró. Iniciá sesión de nuevo.'
              : 'No se pudo crear la organización. Intentá de nuevo más tarde.',
          );
        },
      });
  }

  volverAlMapa(): void {
    this.router.navigateByUrl('/');
  }
}
