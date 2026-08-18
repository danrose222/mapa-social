import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { PublicationsService } from '../../../core/services/publications.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { AuthService } from '../../../core/services/auth.service';
import { Category, Need, Resource } from '../../../core/models/mapa-social.model';

type Tab = 'needs' | 'resources';

// Misma lógica bidireccional que el backend (locality-match.util.ts) --
// duplicada acá a propósito, es una función chica y así el filtro visual
// coincide exacto con lo que el servidor va a permitir o rechazar.
function localitiesMatch(a: string, b: string): boolean {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

@Component({
  selector: 'app-publicaciones-moderador',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './publicaciones-moderador.component.html',
  styleUrl: './publicaciones-moderador.component.scss',
})
export class PublicacionesModeradorComponent {
  private readonly publicationsService = inject(PublicationsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly authService = inject(AuthService);

  readonly isAdmin = this.authService.isAdmin;

  readonly tab = signal<Tab>('needs');
  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly needs = signal<Need[]>([]);
  readonly resources = signal<Resource[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly actionError = signal('');
  readonly processingId = signal<number | null>(null);
  readonly searchTerm = signal('');

  // Por defecto solo se ve lo que corresponde a las localidades asignadas
  // -- el admin no tiene esta restricción, así que para admin este switch
  // no cambia nada (siempre ve todo).
  readonly showOnlyMine = signal(true);

  private readonly myLocalityNames = computed(
    () => (this.authService.profile()?.localities ?? []).map((l) => l.locality),
  );

  isInScope(item: { locality?: string; organization?: { ciudad: string } | null }): boolean {
    if (this.isAdmin() || !this.showOnlyMine()) {
      return true;
    }

    const target = item.organization?.ciudad ?? item.locality;

    // Sin dato de zona no podemos acotar -- el backend tampoco lo hace en
    // ese caso, así que se muestra (mismo criterio de los dos lados).
    if (!target) {
      return true;
    }

    return this.myLocalityNames().some((mine) => localitiesMatch(mine, target));
  }

  readonly filteredNeeds = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.needs().filter((n) => {
      const matchesTerm =
        !term || n.title.toLowerCase().includes(term) || n.description.toLowerCase().includes(term);
      return matchesTerm && this.isInScope(n);
    });
  });

  readonly filteredResources = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.resources().filter((r) => {
      const matchesTerm =
        !term || r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term);
      return matchesTerm && this.isInScope(r);
    });
  });

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

    Promise.all([
      this.publicationsService.getNeeds().toPromise(),
      this.publicationsService.getResources().toPromise(),
    ])
      .then(([needs, resources]) => {
        this.needs.set(needs ?? []);
        this.resources.set(resources ?? []);
        this.isLoading.set(false);
      })
      .catch(() => {
        this.isLoading.set(false);
        this.loadError.set(true);
      });
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
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

  toggleRequiresSolicitud(need: Need): void {
    this.processingId.set(need.id);
    this.actionError.set('');

    this.publicationsService.setRequiresSolicitud(need.id, !need.requiresSolicitud).subscribe({
      next: () => {
        this.processingId.set(null);
        this.load();
      },
      error: () => {
        this.processingId.set(null);
        this.actionError.set('No se pudo cambiar la visibilidad del contacto.');
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
