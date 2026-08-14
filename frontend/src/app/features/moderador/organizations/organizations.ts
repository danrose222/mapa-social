import {
  Component,
  OnInit,
  inject,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import {
  Organization,
  OrganizationsService,
} from '../../../core/services/organizations.service';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
  ],
  templateUrl: './organizations.html',
  styleUrl: './organizations.scss',
})
export class Organizations implements OnInit {
  private readonly organizationsService =
    inject(OrganizationsService);

  organizations: Organization[] = [];

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.organizationsService.getAll().subscribe({
      next: (organizations) => {
        this.organizations = organizations.filter(
          (organization) => !organization.verified,
        );

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage =
          'No se pudieron cargar las organizaciones pendientes.';
      },
    });
  }

  approve(organization: Organization): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.organizationsService
      .approve(organization.id)
      .subscribe({
        next: () => {
          this.organizations =
            this.organizations.filter(
              (item) => item.id !== organization.id,
            );

          this.successMessage =
            `La organización "${organization.name}" fue aprobada.`;
        },
        error: (error) => {
          if (error.status === 403) {
            this.errorMessage =
              'No tenés permisos para aprobar organizaciones.';
            return;
          }

          this.errorMessage =
            'No se pudo aprobar la organización.';
        },
      });
  }

  reject(organization: Organization): void {
    this.errorMessage = '';
    this.successMessage = '';

    const confirmed = window.confirm(
      `¿Querés rechazar la organización "${organization.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    this.organizationsService
      .reject(organization.id)
      .subscribe({
        next: () => {
          this.organizations =
            this.organizations.filter(
              (item) => item.id !== organization.id,
            );

          this.successMessage =
            `La organización "${organization.name}" fue rechazada.`;
        },
        error: (error) => {
          if (error.status === 403) {
            this.errorMessage =
              'No tenés permisos para rechazar organizaciones.';
            return;
          }

          this.errorMessage =
            'No se pudo rechazar la organización.';
        },
      });
  }
}