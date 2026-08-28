import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { OrganizationsService } from '../../../core/services/organizations.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category, Need, Organization, Resource } from '../../../core/models/mapa-social.model';

@Component({
  selector: 'app-organizacion-perfil',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './organizacion-perfil.component.html',
  styleUrl: './organizacion-perfil.component.scss',
})
export class OrganizacionPerfilComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly organizationsService = inject(OrganizationsService);
  private readonly categoriesService = inject(CategoriesService);

  readonly organization = signal<Organization | null>(null);
  readonly resources = signal<Resource[]>([]);
  readonly needs = signal<Need[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.errorMessage.set('Falta indicar qué organización mostrar.');
      this.isLoading.set(false);
      return;
    }

    this.categoriesService.getAll().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => {},
    });

    forkJoin({
      organization: this.organizationsService.getOne(id),
      resources: this.organizationsService.getResources(id),
      needs: this.organizationsService.getNeeds(id),
    }).subscribe({
      next: ({ organization, resources, needs }) => {
        this.organization.set(organization);
        this.resources.set(resources);
        this.needs.set(needs);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          error.status === 404
            ? 'Esta organización no existe.'
            : 'No se pudo cargar el perfil de la organización.',
        );
      },
    });
  }

  categoryName(categoryId: number): string {
    return this.categories().find((c) => c.id === categoryId)?.name ?? '—';
  }
}
