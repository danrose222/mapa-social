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

import {
  AuthService,
} from '../../../core/services/auth.service';

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

  private readonly authService =
    inject(AuthService);

  organizations: Organization[] = [];

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  moderatorCity = '';

  ngOnInit(): void {
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.getProfile().subscribe({
      next: (user) => {
        if (!user.ciudad) {
          this.isLoading = false;
          this.errorMessage =
            'No se pudo determinar la ciudad del moderador.';
          return;
        }

        this.moderatorCity = user.ciudad;

        this.organizationsService.getAll().subscribe({
          next: (organizations) => {
            const moderatorCityNormalized =
              this.normalizeCity(user.ciudad!);

            this.organizations = organizations.filter(
              (organization) =>
                !organization.verified &&
                this.normalizeCity(
                  organization.ciudad,
                ) === moderatorCityNormalized,
            );

            this.isLoading = false;
          },

          error: () => {
            this.isLoading = false;
            this.errorMessage =
              'No se pudieron cargar las organizaciones pendientes.';
          },
        });
      },

      error: () => {
        this.isLoading = false;
        this.errorMessage =
          'No se pudo obtener la información del moderador.';
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
          if (error.status === 401) {
            this.errorMessage =
              'Tu sesión no es válida. Volvé a iniciar sesión.';
            return;
          }

          if (error.status === 403) {
            this.errorMessage =
              'No tenés permisos para aprobar esta organización.';
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
          if (error.status === 401) {
            this.errorMessage =
              'Tu sesión no es válida. Volvé a iniciar sesión.';
            return;
          }

          if (error.status === 403) {
            this.errorMessage =
              'No tenés permisos para rechazar esta organización.';
            return;
          }

          this.errorMessage =
            'No se pudo rechazar la organización.';
        },
      });
  }

  private normalizeCity(city: string): string {
    return city
      .trim()
      .toLocaleLowerCase('es');
  }
}