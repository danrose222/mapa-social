import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';

import { MatCardModule } from '@angular/material/card';

interface Organization {
  id: number;
  name: string;
  type: string;
  ciudad: string;
  verified: boolean;
  description?: string;
  contactInfo?: string;
  address?: string;
}

interface Publicacion {
  id: number;
  title: string;
  description: string;
  address?: string;
  schedule?: string;
  status: string;
  category?: { id: number; name: string };
}

// Punto de partida (rama feature/organizacion-perfil-publico, sobre
// develop): usa los endpoints públicos que agregó Juan
// (GET /organizations/:id, /:id/resources, /:id/needs) para armar la
// página de identidad de cada organización. Referencia de estructura
// visual: frontend/features/organizacion en el fork de Corazones Unidos
// -- ahí trabaja con organizationName (texto libre) y un solo listado de
// recursos; acá se reconstruye contra el id real de Organization y se
// suman las necesidades, ya que el endpoint también existe.
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
