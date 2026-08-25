import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { OrganizationsService } from '../../../core/services/organizations.service';
import { PublicationsService } from '../../../core/services/publications.service';
import {
  CollaborationRequest,
  Need,
  Organization,
  Resource,
  ResourceRequest,
} from '../../../core/models/mapa-social.model';

@Component({
  selector: 'app-mi-organizacion',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './mi-organizacion.component.html',
  styleUrl: './mi-organizacion.component.scss',
})
export class MiOrganizacionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly organizationsService = inject(OrganizationsService);
  private readonly publicationsService = inject(PublicationsService);

  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly organization = signal<Organization | null>(null);
  readonly myResources = signal<Resource[]>([]);
  readonly privateNeeds = signal<Need[]>([]);
  readonly collaborationRequests = signal<CollaborationRequest[]>([]);
  readonly resourceRequests = signal<ResourceRequest[]>([]);

  readonly isSaving = signal(false);
  readonly saveMessage = signal('');
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    name: [''],
    description: [''],
    contactInfo: [''],
    address: [''],
    website: [''],
  });

  constructor() {
    this.authService.refreshProfile().subscribe((profile) => {
      const organizationId = profile?.organization?.id;

      if (!organizationId) {
        this.isLoading.set(false);
        return;
      }

      this.organizationsService.getOne(organizationId).subscribe({
        next: (org) => {
          this.organization.set(org);
          this.form.patchValue({
            name: org.name,
            description: org.description ?? '',
            contactInfo: org.contactInfo ?? '',
            address: org.address ?? '',
            website: org.website ?? '',
          });
          this.isLoading.set(false);

          // Bandeja de necesidades privadas: solo tiene sentido pedirla si
          // ya está avalada -- el backend rechaza con 403 a una organización
          // Pendiente (ver NeedsService.findPrivateForViewer()).
          if (org.verified) {
            this.publicationsService.getPrivateNeedsQueue().subscribe({
              next: (needs) => this.privateNeeds.set(needs),
              error: () => {},
            });

            this.publicationsService.getMyCollaborationRequests().subscribe({
              next: (requests) => this.collaborationRequests.set(requests),
              error: () => {},
            });

            this.publicationsService.getMyResourceRequests().subscribe({
              next: (requests) => this.resourceRequests.set(requests),
              error: () => {},
            });
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.loadError.set(true);
        },
      });

      this.publicationsService.getResources().subscribe({
        next: (resources) =>
          this.myResources.set(resources.filter((r) => r.organizationId === organizationId)),
        error: () => {},
      });
    });
  }

  save(): void {
    const org = this.organization();
    if (!org || this.isSaving()) {
      return;
    }

    const raw = this.form.getRawValue();

    this.isSaving.set(true);
    this.saveMessage.set('');
    this.errorMessage.set('');

    this.organizationsService
      .update(org.id, {
        name: raw.name || undefined,
        description: raw.description || undefined,
        contactInfo: raw.contactInfo || undefined,
        address: raw.address || undefined,
        website: raw.website || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.organization.set(updated);
          this.saveMessage.set('Guardado.');
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.errorMessage.set(
            error.status === 403
              ? 'No tenés permiso para editar esta organización.'
              : 'No se pudo guardar. Intentá de nuevo.',
          );
        },
      });
  }
}
