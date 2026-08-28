import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicationsService } from '../../core/services/publications.service';
import { CategoriesService } from '../../core/services/categories.service';
import { AuthService } from '../../core/services/auth.service';
import { Category, Need, Resource, ResourceRequest } from '../../core/models/mapa-social.model';

type Tab = 'needs' | 'resources' | 'solicitudes';

@Component({
  selector: 'app-mis-publicaciones',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './mis-publicaciones.component.html',
  styleUrl: './mis-publicaciones.component.scss',
})
export class MisPublicacionesComponent {
  private readonly publicationsService = inject(PublicationsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly authService = inject(AuthService);

  // "Mi espacio" ya distingue por esto (ver app-shell): un usuario común
  // (sin organización) nunca pudo publicar un recurso -- ResourcesService
  // .create() lo rechaza en el backend --, así que esa pestaña no le
  // aporta nada y en cambio sí necesita ver sus solicitudes directas a
  // organizaciones, que a un miembro de organización no le sirven acá.
  readonly belongsToOrganization = this.authService.belongsToOrganization;

  // El signal de abajo (no un valor fijo calculado una sola vez acá) es a
  // propósito: belongsToOrganization() puede seguir cambiando después de
  // construirse este componente (el perfil real todavía no llegó, ver el
  // mismo comentario en app-shell.component.ts) -- con un valor fijo, la
  // pestaña por defecto quedaba pegada al estado viejo aunque los botones
  // de pestaña (que sí son reactivos) ya reflejaran el rol correcto. Una
  // vez que el usuario clickea una pestaña, esa elección manda por sobre
  // el default reactivo.
  private readonly manualTab = signal<Tab | null>(null);

  readonly tab = computed<Tab>(
    () => this.manualTab() ?? (this.authService.belongsToOrganization() ? 'needs' : 'solicitudes'),
  );
  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly needs = signal<Need[]>([]);
  readonly resources = signal<Resource[]>([]);
  readonly resourceRequests = signal<ResourceRequest[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly actionError = signal('');
  readonly processingId = signal<number | null>(null);

  readonly showEmptyState = computed(
    () =>
      !this.belongsToOrganization() &&
      this.needs().length === 0 &&
      this.resourceRequests().length === 0,
  );

  constructor() {
    this.categoriesService.getAll().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => {},
    });

    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.loadError.set(false);

    // A una organización no le sirve ver "sus" solicitudes enviadas (no
    // manda ninguna desde acá) y a un usuario común nunca le va a traer
    // recursos propios -- se evita el pedido que sabemos vacío de antemano.
    const belongsToOrganization = this.belongsToOrganization();

    Promise.all([
      this.publicationsService.getMyNeeds().toPromise(),
      belongsToOrganization
        ? this.publicationsService.getMyResources().toPromise()
        : Promise.resolve([]),
      belongsToOrganization
        ? Promise.resolve([])
        : this.publicationsService.getMySentResourceRequests().toPromise(),
    ])
      .then(([needs, resources, resourceRequests]) => {
        this.needs.set(needs ?? []);
        this.resources.set(resources ?? []);
        this.resourceRequests.set(resourceRequests ?? []);
        this.isLoading.set(false);
      })
      .catch(() => {
        this.isLoading.set(false);
        this.loadError.set(true);
      });
  }

  setTab(tab: Tab): void {
    this.manualTab.set(tab);
  }

  categoryName(categoryId: number): string {
    return this.categories().find((c) => c.id === categoryId)?.name ?? '—';
  }

  resolveNeed(need: Need): void {
    this.processingId.set(need.id);
    this.actionError.set('');

    this.publicationsService.updateNeedStatus(need.id, 'resolved').subscribe({
      next: () => {
        this.processingId.set(null);
        this.load();
      },
      error: () => {
        this.processingId.set(null);
        this.actionError.set('No se pudo marcar como resuelta.');
      },
    });
  }

  deleteNeed(need: Need): void {
    if (!confirm(`¿Eliminar la necesidad "${need.title}"? No se puede deshacer.`)) {
      return;
    }

    this.processingId.set(need.id);
    this.actionError.set('');

    this.publicationsService.removeNeed(need.id).subscribe({
      next: () => {
        this.processingId.set(null);
        this.load();
      },
      error: () => {
        this.processingId.set(null);
        this.actionError.set('No se pudo eliminar la necesidad.');
      },
    });
  }

  resolveResource(resource: Resource): void {
    this.processingId.set(resource.id);
    this.actionError.set('');

    this.publicationsService.updateResourceStatus(resource.id, 'resolved').subscribe({
      next: () => {
        this.processingId.set(null);
        this.load();
      },
      error: () => {
        this.processingId.set(null);
        this.actionError.set('No se pudo marcar como resuelto.');
      },
    });
  }

  deleteResource(resource: Resource): void {
    if (!confirm(`¿Eliminar el recurso "${resource.title}"? No se puede deshacer.`)) {
      return;
    }

    this.processingId.set(resource.id);
    this.actionError.set('');

    this.publicationsService.removeResource(resource.id).subscribe({
      next: () => {
        this.processingId.set(null);
        this.load();
      },
      error: () => {
        this.processingId.set(null);
        this.actionError.set('No se pudo eliminar el recurso.');
      },
    });
  }
}