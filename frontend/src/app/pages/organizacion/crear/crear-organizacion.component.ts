import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { OrganizationsService } from '../../../core/services/organizations.service';
import { MunicipiosService } from '../../../core/services/municipios.service';
import {
  LocalityAutocompleteComponent,
  LocalitySelection,
} from '../../../shared/components/locality-autocomplete/locality-autocomplete.component';

type JurisdictionCheck = 'idle' | 'checking' | 'city' | 'self-managed';

@Component({
  selector: 'app-crear-organizacion',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LocalityAutocompleteComponent],
  templateUrl: './crear-organizacion.component.html',
  styleUrl: './crear-organizacion.component.scss',
})
export class CrearOrganizacionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly organizationsService = inject(OrganizationsService);
  private readonly municipiosService = inject(MunicipiosService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly submitted = signal(false);
  // Se completa recién con la respuesta real del backend -- antes de eso
  // no hay forma honesta de saber si quedó pendiente o avalada de una.
  readonly submittedVerified = signal(false);
  readonly submittedCiudad = signal('');
  readonly jurisdictionCheck = signal<JurisdictionCheck>('idle');

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    type: ['comunidad' as 'comunidad' | 'ong', [Validators.required]],
    ciudad: ['', [Validators.required]],
    description: [''],
    contactInfo: [''],
    address: [''],
    website: [''],
    acceptTerms: [false, [Validators.requiredTrue]],
  });

  onLocalitySelected(selection: LocalitySelection): void {
    this.form.patchValue({ ciudad: selection.locality });

    this.jurisdictionCheck.set('checking');
    this.municipiosService.checkCiudad(selection.locality).subscribe({
      next: ({ isCityScale }) => {
        this.jurisdictionCheck.set(isCityScale ? 'city' : 'self-managed');
      },
      error: () => this.jurisdictionCheck.set('idle'),
    });
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
        website: raw.website || undefined,
      })
      .subscribe({
        next: (organization) => {
          this.isSubmitting.set(false);
          this.submittedVerified.set(organization.verified);
          this.submittedCiudad.set(organization.ciudad);
          this.submitted.set(true);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            error.status === 401
              ? 'Tu sesión expiró. Iniciá sesión de nuevo.'
              : error.status === 409
                ? 'Ya existe una organización registrada con ese nombre.'
                : 'No se pudo crear la organización. Intentá de nuevo más tarde.',
          );
        },
      });
  }

  irAlPanel(): void {
    this.router.navigateByUrl('/organizacion/mi-organizacion');
  }

  volverAlMapa(): void {
    this.router.navigateByUrl('/mapa');
  }
}
