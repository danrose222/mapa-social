// Esta vista usa el id real de Organization en la ruta /organizacion/:id,
// a diferencia de la referencia de Corazones Unidos que trabaja con
// organizationName como texto libre.
//
// Además de los recursos, este perfil también muestra las necesidades
// publicadas por la organización porque el backend expone ambos endpoints:
// GET /organizations/:id/resources
// GET /organizations/:id/needs
import { Component, OnInit, inject, signal } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';

import { MatCardModule } from '@angular/material/card';

import { Organization } from '../../../core/services/organizations.service';

interface Publicacion {
  id: number;
  title: string;
  description: string;
  address?: string;
  schedule?: string;
  status: string;
  category?: {
    id: number;
    name: string;
  };
}

@Component({
  selector: 'app-organizacion-perfil',
  standalone: true,
  imports: [MatCardModule],
  templateUrl: './organizacion-perfil.component.html',
  styleUrl: './organizacion-perfil.component.scss',
})
export class OrganizacionPerfilComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  private readonly http = inject(HttpClient);

  readonly organizacion = signal<Organization | null>(null);

  readonly recursos = signal<Publicacion[]>([]);

  readonly necesidades = signal<Publicacion[]>([]);

  readonly isLoading = signal(true);

  readonly errorMessage = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage.set('Falta indicar qué organización mostrar.');

      this.isLoading.set(false);

      return;
    }

    this.cargarPerfil(id);
  }

  private cargarPerfil(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      organizacion: this.http.get<Organization>(`/api/organizations/${id}`),

      recursos: this.http.get<Publicacion[]>(`/api/organizations/${id}/resources`),

      necesidades: this.http.get<Publicacion[]>(`/api/organizations/${id}/needs`),
    }).subscribe({
      next: ({ organizacion, recursos, necesidades }) => {
        this.organizacion.set(organizacion);

        this.recursos.set(recursos);

        this.necesidades.set(necesidades);

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
}
