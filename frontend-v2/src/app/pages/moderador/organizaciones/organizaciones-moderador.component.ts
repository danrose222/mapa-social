import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { OrganizationsService } from '../../../core/services/organizations.service';
import { Organization } from '../../../core/models/mapa-social.model';

@Component({
  selector: 'app-organizaciones-moderador',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './organizaciones-moderador.component.html',
  styleUrl: './organizaciones-moderador.component.scss',
})
export class OrganizacionesModeradorComponent {
  private readonly authService = inject(AuthService);
  private readonly organizationsService = inject(OrganizationsService);

  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly allOrganizations = signal<Organization[]>([]);
  readonly actionError = signal('');
  readonly processingId = signal<number | null>(null);

  private readonly myLocalityNames = computed(
    () =>
      new Set(
        (this.authService.profile()?.localities ?? []).map((l) =>
          l.locality.trim().toLowerCase(),
        ),
      ),
  );

  // Solo organizaciones de una localidad que este moderador tiene asignada
  // -- el backend igual lo vuelve a validar en el PATCH/DELETE, esto es
  // nomás para no mostrar en la lista algo que después va a rebotar con 403.
  private readonly inScopeOrganizations = computed(() =>
    this.allOrganizations().filter((org) =>
      this.myLocalityNames().has(org.ciudad.trim().toLowerCase()),
    ),
  );

  readonly pending = computed(() => this.inScopeOrganizations().filter((o) => !o.verified));
  readonly verified = computed(() => this.inScopeOrganizations().filter((o) => o.verified));

  constructor() {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.loadError.set(false);

    this.organizationsService.getAll().subscribe({
      next: (organizations) => {
        this.allOrganizations.set(organizations);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set(true);
      },
    });
  }

  approve(org: Organization): void {
    this.processingId.set(org.id);
    this.actionError.set('');

    this.organizationsService.approve(org.id).subscribe({
      next: () => {
        this.processingId.set(null);
        this.load();
      },
      error: () => {
        this.processingId.set(null);
        this.actionError.set('No se pudo avalar la organización. Intentá de nuevo.');
      },
    });
  }

  reject(org: Organization): void {
    const confirmed = confirm(
      `¿Rechazar "${org.name}"? Esto la elimina -- no queda como "rechazada", queda borrada del todo, porque el sistema todavía no tiene un estado intermedio para eso.`,
    );

    if (!confirmed) {
      return;
    }

    this.processingId.set(org.id);
    this.actionError.set('');

    this.organizationsService.remove(org.id).subscribe({
      next: () => {
        this.processingId.set(null);
        this.load();
      },
      error: () => {
        this.processingId.set(null);
        this.actionError.set('No se pudo rechazar la organización. Intentá de nuevo.');
      },
    });
  }
}
