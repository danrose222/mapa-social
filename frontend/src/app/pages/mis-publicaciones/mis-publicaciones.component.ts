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

  resolveNeed(need: any): void {
    const targetId = need?.id ?? need?._id ?? need?.id_need;

    if (!targetId) {
      this.actionError.set('No se encontró el ID de la necesidad.');
      return;
    }

    this.processingId.set(targetId);
    this.actionError.set('');

    this.publicationsService.updateNeedStatus(targetId, 'resolved').subscribe({
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

  deleteNeed(need: any): void {
    const targetId = need?.id ?? need?._id ?? need?.id_need;

    if (!targetId) {
      this.actionError.set('No se encontró el ID de la necesidad.');
      return;
    }

    if (!confirm(`¿Eliminar la necesidad "${need.title}"? No se puede deshacer.`)) {
      return;
    }

    this.processingId.set(targetId);
    this.actionError.set('');

    this.publicationsService.removeNeed(targetId).subscribe({
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

  resolveResource(resource: any): void {
    const targetId = resource?.id ?? resource?._id ?? resource?.id_resource;

    if (!targetId) {
      this.actionError.set('No se encontró el ID del recurso.');
      return;
    }

    this.processingId.set(targetId);
    this.actionError.set('');

    this.publicationsService.updateResourceStatus(targetId, 'resolved').subscribe({
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

  deleteResource(resource: any): void {
    const targetId = resource?.id ?? resource?._id ?? resource?.id_resource;

    if (!targetId) {
      this.actionError.set('No se encontró el ID del recurso.');
      return;
    }

    if (!confirm(`¿Eliminar el recurso "${resource.title}"? No se puede deshacer.`)) {
      return;
    }

    this.processingId.set(targetId);
    this.actionError.set('');

    this.publicationsService.removeResource(targetId).subscribe({
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