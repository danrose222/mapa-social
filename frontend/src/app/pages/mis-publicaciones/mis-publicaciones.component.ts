import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { PublicationsService } from '../../core/services/publications.service';
import { CategoriesService } from '../../core/services/categories.service';
import { Category, Need, Resource } from '../../core/models/mapa-social.model';

type Tab = 'needs' | 'resources';

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

  readonly tab = signal<Tab>('needs');
  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly needs = signal<Need[]>([]);
  readonly resources = signal<Resource[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly actionError = signal('');
  readonly processingId = signal<number | null>(null);

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
      this.publicationsService.getMyNeeds().toPromise(),
      this.publicationsService.getMyResources().toPromise(),
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
